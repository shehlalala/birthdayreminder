import { SyncError, type PullCursor, type RemoteStore } from '../sync';
import type { RemoteRow, TableName } from '../tables';

/**
 * In-memory stand-in for Supabase that mimics the server rules the sync
 * relies on: per-user isolation, last-write-wins on updated_at, server-set
 * synced_at with microseconds, and keyset paging.
 */
export class FakeRemote {
  tables = new Map<TableName, Map<string, RemoteRow & { user_id: string }>>();
  offline = false;
  /** Return a reason to reject a row (like a check constraint), or null. */
  reject: (table: TableName, row: RemoteRow) => string | null = () => null;
  private clock = Date.parse('2026-10-01T00:00:00Z');
  private micros = 0;

  rows(table: TableName): RemoteRow[] {
    return [...(this.tables.get(table)?.values() ?? [])];
  }

  private nextSyncedAt(): string {
    this.micros += 7;
    const ms = this.clock + Math.floor(this.micros / 1000);
    const iso = new Date(ms).toISOString().replace('Z', '');
    return `${iso}${String(this.micros % 1000).padStart(3, '0')}+00:00`;
  }

  forUser(userId: string): RemoteStore {
    return {
      upsert: async (table, key, rows) => {
        if (this.offline) throw new SyncError('Network request failed', 'offline');
        for (const row of rows) {
          if (row.user_id !== userId) throw new SyncError('42501: row-level security', 'rejected');
          const reason = this.reject(table, row);
          if (reason) throw new SyncError(reason, 'rejected');
        }
        const store = this.tables.get(table) ?? new Map();
        this.tables.set(table, store);
        for (const row of rows) {
          const id = String(row[key]);
          const existing = store.get(id);
          if (existing && existing.user_id !== userId) throw new SyncError('42501: row-level security', 'rejected');
          if (existing && Date.parse(String(row.updated_at)) < Date.parse(String(existing.updated_at))) continue;
          store.set(id, { ...row, user_id: userId, synced_at: this.nextSyncedAt() });
        }
      },
      pullPage: async (table, key, after: PullCursor | null, limit) => {
        if (this.offline) throw new SyncError('Network request failed', 'offline');
        const sortKey = (r: RemoteRow) => `${normalize(String(r.synced_at))}|${String(r[key])}`;
        const afterKey = after ? `${normalize(after.syncedAt)}|${after.key}` : '';
        return this.rows(table)
          .filter((r) => r.user_id === userId)
          .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
          .filter((r) => sortKey(r) > afterKey)
          .slice(0, limit);
      },
    };
  }
}

/** Comparable form of a timestamp: UTC ISO with microseconds. */
function normalize(value: string): string {
  const match = /^(.+?)(?:\.(\d+))?(Z|[+-]\d\d:\d\d)$/.exec(value.replace(' ', 'T'))!;
  const ms = Date.parse(`${match[1]}${match[3]}`);
  const fraction = (match[2] ?? '').padEnd(6, '0');
  return `${new Date(ms).toISOString().slice(0, 19)}.${fraction}`;
}
