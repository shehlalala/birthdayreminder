import { DatabaseSync } from 'node:sqlite';

import type { SqlDb } from '../db';
import { migrate } from '../schema';

/** SqlDb over Node's built-in SQLite, running the app's real local schema. */
export async function openTestDatabase(): Promise<SqlDb> {
  const raw = new DatabaseSync(':memory:');
  let depth = 0;
  const db: SqlDb = {
    exec: async (sql) => raw.exec(sql),
    run: async (sql, params = []) => ({ changes: Number(raw.prepare(sql).run(...params).changes) }),
    all: async <T,>(sql: string, params: (string | number | null)[] = []) => raw.prepare(sql).all(...params) as T[],
    first: async <T,>(sql: string, params: (string | number | null)[] = []) =>
      (raw.prepare(sql).get(...params) as T | undefined) ?? null,
    transaction: async (fn) => {
      // Nested calls join the outer transaction, like expo-sqlite's.
      if (depth > 0) return fn();
      depth++;
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      } finally {
        depth--;
      }
    },
  };
  await migrate(db);
  return db;
}
