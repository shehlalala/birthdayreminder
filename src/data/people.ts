import { relationFromColumns, relationToColumns, type Person, type PersonInput } from '@/domain/person';
import type { SqlDb } from './db';
import { deletePerson, ensureSettings, insertRow, updateRow, type WriteDeps } from './writes';

export { deletePerson };

interface PersonRow {
  id: string;
  name: string;
  birth_day: number;
  birth_month: number;
  birth_year: number | null;
  relation_key: string | null;
  relation_custom: string | null;
  note: string | null;
  sync_error: string | null;
}

const SELECT = `SELECT id, name, birth_day, birth_month, birth_year, relation_key, relation_custom, note, sync_error
  FROM people WHERE deleted_at IS NULL`;

function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    birthDay: row.birth_day,
    birthMonth: row.birth_month,
    birthYear: row.birth_year,
    relation: relationFromColumns(row.relation_key, row.relation_custom),
    note: row.note,
    syncError: row.sync_error,
  };
}

function toColumns(input: PersonInput) {
  return {
    name: input.name,
    birth_day: input.birthDay,
    birth_month: input.birthMonth,
    birth_year: input.birthYear,
    ...relationToColumns(input.relation),
    note: input.note,
  };
}

export async function listPeople(db: SqlDb): Promise<Person[]> {
  return (await db.all<PersonRow>(SELECT)).map(toPerson);
}

export async function getPerson(db: SqlDb, id: string): Promise<Person | null> {
  const row = await db.first<PersonRow>(`${SELECT} AND id = ?`, [id]);
  return row ? toPerson(row) : null;
}

/** Adds a person with the user's default reminder set. */
export async function createPerson(db: SqlDb, input: PersonInput, deps: WriteDeps): Promise<string> {
  await ensureSettings(db);
  const settings = await db.first<{ default_reminder_days: string }>('SELECT default_reminder_days FROM user_settings');
  const days: number[] = JSON.parse(settings?.default_reminder_days ?? '[]');
  let id = '';
  await db.transaction(async () => {
    id = await insertRow(db, 'people', toColumns(input), deps);
    for (const daysBefore of new Set(days)) {
      await insertRow(db, 'reminders', { person_id: id, days_before: daysBefore }, deps);
    }
  });
  return id;
}

export async function updatePerson(db: SqlDb, id: string, input: PersonInput, deps: WriteDeps): Promise<void> {
  await updateRow(db, 'people', id, toColumns(input), deps);
}
