import * as SQLite from 'expo-sqlite';

import type { SqlDb } from './db';
import { migrate } from './schema';

let opening: Promise<SqlDb> | null = null;

/** The app's single local database, migrated on first open. */
export function openAppDatabase(): Promise<SqlDb> {
  opening ??= (async () => {
    const raw = await SQLite.openDatabaseAsync('birthdays.db');
    await raw.execAsync('PRAGMA journal_mode = WAL;');
    const db: SqlDb = {
      exec: (sql) => raw.execAsync(sql),
      run: async (sql, params = []) => ({ changes: (await raw.runAsync(sql, params)).changes }),
      all: (sql, params = []) => raw.getAllAsync(sql, params),
      first: (sql, params = []) => raw.getFirstAsync(sql, params),
      transaction: (fn) => raw.withTransactionAsync(fn),
    };
    await migrate(db);
    return db;
  })();
  return opening;
}
