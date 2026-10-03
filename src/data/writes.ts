import { emitDataChange } from './changes';
import type { SqlDb, SqlValue } from './db';
import { TABLES, type TableName } from './tables';

// Every local write goes through here so rows always get a fresh updated_at,
// are marked dirty for the next push, and lose any previous sync_error.

export interface WriteDeps {
  newId: () => string;
  now: () => Date;
}

/**
 * The next updated_at for a row. Never goes backwards, even if the device
 * clock does, so a user's own later edit can't lose last-write-wins.
 */
export function nextTimestamp(now: Date, previous?: string | null): string {
  const prev = previous ? Date.parse(previous) : -Infinity;
  return new Date(Math.max(now.getTime(), prev + 1)).toISOString();
}

type Values = Record<string, SqlValue>;
type EntityTable = Exclude<TableName, 'user_settings'>;

function checkColumns(table: TableName, values: Values) {
  const allowed = TABLES.find((t) => t.name === table)!.columns;
  for (const column of Object.keys(values)) {
    if (!allowed.includes(column) || ['id', 'created_at', 'updated_at'].includes(column)) {
      throw new Error(`Column ${column} can't be written on ${table}`);
    }
  }
}

export async function insertRow(db: SqlDb, table: EntityTable, values: Values, deps: WriteDeps): Promise<string> {
  checkColumns(table, values);
  const id = deps.newId();
  const ts = nextTimestamp(deps.now());
  const row: Values = { ...values, id, created_at: ts, updated_at: ts, dirty: 1 };
  const columns = Object.keys(row);
  await db.run(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((c) => row[c]),
  );
  emitDataChange([table], 'local');
  return id;
}

export async function updateRow(db: SqlDb, table: TableName, id: string, values: Values, deps: WriteDeps): Promise<void> {
  checkColumns(table, values);
  const current = await db.first<{ updated_at: string }>(`SELECT updated_at FROM ${table} WHERE id = ?`, [id]);
  if (!current) throw new Error(`${table} ${id} not found`);
  const columns = Object.keys(values);
  await db.run(
    `UPDATE ${table} SET ${columns.map((c) => `${c} = ?, `).join('')}updated_at = ?, dirty = 1, sync_error = NULL WHERE id = ?`,
    [...columns.map((c) => values[c]), nextTimestamp(deps.now(), current.updated_at), id],
  );
  emitDataChange([table], 'local');
}

export async function softDelete(db: SqlDb, table: EntityTable, id: string, deps: WriteDeps): Promise<void> {
  await updateRow(db, table, id, { deleted_at: deps.now().toISOString() }, deps);
}

/** Deletes a person and their reminders and gift ideas, as tombstones that sync. */
export async function deletePerson(db: SqlDb, personId: string, deps: WriteDeps): Promise<void> {
  await db.transaction(async () => {
    for (const child of ['reminders', 'gift_ideas'] as const) {
      const rows = await db.all<{ id: string }>(`SELECT id FROM ${child} WHERE person_id = ? AND deleted_at IS NULL`, [personId]);
      for (const { id } of rows) await softDelete(db, child, id, deps);
    }
    await softDelete(db, 'people', personId, deps);
  });
}

/**
 * Creates the local settings row with defaults if it doesn't exist yet.
 * Defaults are stamped at the epoch and not dirty, so settings that already
 * exist on the server (e.g. after a reinstall and sign-in) always win.
 */
export async function ensureSettings(db: SqlDb): Promise<void> {
  const epoch = new Date(0).toISOString();
  const { changes } = await db.run(
    `INSERT INTO user_settings (id, created_at, updated_at, dirty) VALUES ('me', ?, ?, 0) ON CONFLICT (id) DO NOTHING`,
    [epoch, epoch],
  );
  if (changes) emitDataChange(['user_settings'], 'local');
}
