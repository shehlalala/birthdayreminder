import { emitDataChange } from './changes';
import type { SqlDb } from './db';
import { TABLES, normalizeTimestamp, toMillis, type RemoteRow, type TableName, type TableSpec } from './tables';

// Offline-first sync: local SQLite is the source of truth for the UI; this
// pushes local changes and pulls remote ones. Pure apart from its two
// dependencies, so it is tested end to end with fakes (sync.test.ts).
//
// Conflict rule: last write wins on updated_at. The server enforces it too
// (sync_guard trigger), so a stale push can't overwrite a newer row.

export interface PullCursor {
  /** Raw server synced_at (keeps microseconds; never round-tripped through Date). */
  syncedAt: string;
  /** Row key, breaks ties between rows with the same synced_at. */
  key: string;
}

export interface RemoteStore {
  /** Insert or update rows by key. Throws SyncError. */
  upsert(table: TableName, key: TableSpec['remoteKey'], rows: RemoteRow[]): Promise<void>;
  /** Rows with (synced_at, key) > after, ordered by (synced_at, key). Throws SyncError. */
  pullPage(table: TableName, key: TableSpec['remoteKey'], after: PullCursor | null, limit: number): Promise<RemoteRow[]>;
}

/**
 * 'offline' — network, timeout, server error, expired token: retry later.
 * 'rejected' — the server refused this data (constraint, RLS): retrying won't help.
 */
export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'rejected',
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export interface SyncOptions {
  /** UUID generator, used to re-key local rows when the account changes. */
  newId: () => string;
  pushBatchSize?: number;
  pullPageSize?: number;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  rejected: number;
}

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
/** Re-read this much before the saved cursor, to catch transactions that committed late. */
const PULL_OVERLAP_MS = 60_000;
const MAX_PUSH_ROUNDS = 50;

export async function syncOnce(db: SqlDb, remote: RemoteStore, userId: string, options: SyncOptions): Promise<SyncResult> {
  const { newId, pushBatchSize = 200, pullPageSize = 500 } = options;
  const result: SyncResult = { pushed: 0, pulled: 0, rejected: 0 };

  await adoptUser(db, userId, newId);
  for (const table of TABLES) await pushTable(db, remote, table, userId, pushBatchSize, result);
  const changed: TableName[] = [];
  for (const table of TABLES) {
    const before = result.pulled;
    await pullTable(db, remote, table, pullPageSize, result);
    if (result.pulled > before) changed.push(table.name);
  }
  if (changed.length) emitDataChange(changed, 'remote');
  return result;
}

// ---------------------------------------------------------------------------

/**
 * The first sync attaches local rows to the user. If the signed-in user
 * changes (e.g. Sign in with Apple lands on an existing account), local rows
 * are merged into that account and its data is pulled from scratch. Rows that
 * were already uploaded under the previous user get new ids first: the server
 * (rightly) refuses to move a row id from one user to another.
 */
async function adoptUser(db: SqlDb, userId: string, newId: () => string): Promise<void> {
  const previous = await getState(db, 'user_id');
  if (previous === userId) return;
  await db.transaction(async () => {
    if (previous !== null) await rekeyLocalRows(db, newId);
    for (const table of TABLES) {
      await db.run(`UPDATE ${table.name} SET dirty = 1, sync_error = NULL`);
    }
    await db.run(`DELETE FROM sync_state WHERE key LIKE 'cursor:%'`);
    await setState(db, 'user_id', userId);
  });
}

async function rekeyLocalRows(db: SqlDb, newId: () => string): Promise<void> {
  // Tombstones belong to the old account only; nothing to carry over.
  for (const table of ['reminders', 'gift_ideas', 'people'] as const) {
    await db.run(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`);
  }
  for (const { id } of await db.all<{ id: string }>('SELECT id FROM people')) {
    const next = newId();
    await db.run('UPDATE people SET id = ? WHERE id = ?', [next, id]);
    await db.run('UPDATE reminders SET person_id = ? WHERE person_id = ?', [next, id]);
    await db.run('UPDATE gift_ideas SET person_id = ? WHERE person_id = ?', [next, id]);
  }
  for (const table of ['reminders', 'gift_ideas'] as const) {
    for (const { id } of await db.all<{ id: string }>(`SELECT id FROM ${table}`)) {
      await db.run(`UPDATE ${table} SET id = ? WHERE id = ?`, [newId(), id]);
    }
  }
}

async function pushTable(db: SqlDb, remote: RemoteStore, table: TableSpec, userId: string, batchSize: number, result: SyncResult) {
  for (let round = 0; round < MAX_PUSH_ROUNDS; round++) {
    const rows = await db.all<Record<string, string | number | null>>(
      `SELECT ${table.columns.join(', ')} FROM ${table.name}
       WHERE dirty = 1 AND sync_error IS NULL ORDER BY updated_at LIMIT ?`,
      [batchSize],
    );
    if (rows.length === 0) return;

    let accepted = rows;
    try {
      await remote.upsert(table.name, table.remoteKey, rows.map((r) => table.toRemote(r, userId)));
    } catch (error) {
      if (!isRejected(error)) throw error;
      // Find the bad rows one by one so one invalid row can't block the rest.
      accepted = [];
      for (const row of rows) {
        try {
          await remote.upsert(table.name, table.remoteKey, [table.toRemote(row, userId)]);
          accepted.push(row);
        } catch (rowError) {
          if (!isRejected(rowError)) throw rowError;
          await db.run(`UPDATE ${table.name} SET sync_error = ? WHERE id = ? AND updated_at = ?`, [
            (rowError as Error).message.slice(0, 500),
            row.id,
            row.updated_at,
          ]);
          result.rejected++;
        }
      }
    }

    // Only clear rows not edited while the push was in flight.
    for (const row of accepted) {
      await db.run(`UPDATE ${table.name} SET dirty = 0 WHERE id = ? AND updated_at = ?`, [row.id, row.updated_at]);
    }
    result.pushed += accepted.length;
  }
}

async function pullTable(db: SqlDb, remote: RemoteStore, table: TableSpec, pageSize: number, result: SyncResult) {
  const cursorKey = `cursor:${table.name}`;
  const saved = parseCursor(await getState(db, cursorKey));
  let after: PullCursor | null = saved && {
    syncedAt: new Date(toMillis(saved.syncedAt) - PULL_OVERLAP_MS).toISOString(),
    key: ZERO_UUID,
  };
  let newest = saved;

  for (;;) {
    const page = await remote.pullPage(table.name, table.remoteKey, after, pageSize);
    if (page.length === 0) break;

    await db.transaction(async () => {
      for (const remoteRow of page) {
        if (await mergeRow(db, table, remoteRow)) result.pulled++;
      }
    });

    const last = page[page.length - 1];
    after = { syncedAt: String(last.synced_at), key: String(last[table.remoteKey]) };
    if (!newest || toMillis(after.syncedAt) >= toMillis(newest.syncedAt)) newest = after;
    if (page.length < pageSize) break;
  }

  if (newest && newest !== saved) await setState(db, cursorKey, JSON.stringify(newest));
}

/** Applies a remote row if it is newer than the local one. Returns whether it changed anything. */
async function mergeRow(db: SqlDb, table: TableSpec, remoteRow: RemoteRow): Promise<boolean> {
  const row = table.fromRemote(remoteRow);
  const local = await db.first<{ updated_at: string; dirty: number }>(
    `SELECT updated_at, dirty FROM ${table.name} WHERE id = ?`,
    [row.id],
  );
  const columns = table.columns;
  const values = columns.map((c) => row[c] ?? null);

  if (!local) {
    await db.run(
      `INSERT INTO ${table.name} (${columns.join(', ')}, dirty) VALUES (${columns.map(() => '?').join(', ')}, 0)`,
      values,
    );
    return true;
  }

  const remoteUpdated = normalizeTimestamp(row.updated_at)!;
  const remoteWins = remoteUpdated > local.updated_at || (remoteUpdated === local.updated_at && !local.dirty);
  if (!remoteWins) return false; // local is newer; it stays dirty and is pushed next time

  await db.run(
    `UPDATE ${table.name} SET ${columns.map((c) => `${c} = ?`).join(', ')}, dirty = 0, sync_error = NULL WHERE id = ?`,
    [...values, row.id],
  );
  return remoteUpdated !== local.updated_at;
}

// ---------------------------------------------------------------------------

function isRejected(error: unknown): boolean {
  return error instanceof SyncError && error.kind === 'rejected';
}

function parseCursor(value: string | null): PullCursor | null {
  return value ? (JSON.parse(value) as PullCursor) : null;
}

export async function getState(db: SqlDb, key: string): Promise<string | null> {
  const row = await db.first<{ value: string | null }>('SELECT value FROM sync_state WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setState(db: SqlDb, key: string, value: string): Promise<void> {
  await db.run('INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', [key, value]);
}
