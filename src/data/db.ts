// The small slice of SQLite the data layer needs. expo-sqlite implements it
// in the app (openAppDatabase.ts); tests use node:sqlite (test/nodeSqlite.ts).
export type SqlValue = string | number | null;

export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  /** Runs fn inside a transaction; rolls back if it throws. */
  transaction(fn: () => Promise<void>): Promise<void>;
}
