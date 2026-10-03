import type { SqlDb } from './db';

// Local SQLite schema. Mirrors supabase/migrations without user_id or
// synced_at (the server owns those), plus sync bookkeeping:
//   dirty      1 = changed locally since the last successful push
//   sync_error why the server rejected this row; cleared by the next local edit
// Timestamps are ISO strings (Date#toISOString) so they compare as text.
// No local foreign keys: a pull can briefly deliver a child before its parent;
// the server enforces ownership and integrity.
// Append to MIGRATIONS; never edit a shipped entry.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE people (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    birth_day INTEGER NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_year INTEGER,
    relation_key TEXT,
    relation_custom TEXT,
    photo_path TEXT,
    note TEXT,
    reminder_time TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    dirty INTEGER NOT NULL DEFAULT 1,
    sync_error TEXT
  );
  CREATE TABLE reminders (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL,
    days_before INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    dirty INTEGER NOT NULL DEFAULT 1,
    sync_error TEXT
  );
  CREATE INDEX reminders_person ON reminders (person_id);
  CREATE TABLE gift_ideas (
    id TEXT PRIMARY KEY NOT NULL,
    person_id TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT,
    url TEXT,
    price REAL,
    bought INTEGER NOT NULL DEFAULT 0,
    given_year INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    dirty INTEGER NOT NULL DEFAULT 1,
    sync_error TEXT
  );
  CREATE INDEX gift_ideas_person ON gift_ideas (person_id);
  -- Exactly one row, id = 'me'. Maps to the user's row on the server.
  CREATE TABLE user_settings (
    id TEXT PRIMARY KEY NOT NULL CHECK (id = 'me'),
    reminder_time TEXT NOT NULL DEFAULT '09:00',
    default_reminder_days TEXT NOT NULL DEFAULT '[0,7]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 1,
    sync_error TEXT
  );
  CREATE TABLE sync_state (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,
];

export async function migrate(db: SqlDb): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[version]);
      await db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
