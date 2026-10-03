import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { createPerson, deletePerson, getPerson, listPeople, updatePerson } from './people';
import { openTestDatabase } from './test/nodeSqlite';
import { ensureSettings, updateRow } from './writes';

const deps = { newId: randomUUID, now: () => new Date('2026-10-03T09:00:00Z') };
const input = { name: 'Leyla', birthDay: 12, birthMonth: 5, birthYear: 1996, relation: { kind: 'preset', key: 'friend' } as const, note: null };

describe('people repository', () => {
  it('creates a person with the default reminder set', async () => {
    const db = await openTestDatabase();
    const id = await createPerson(db, input, deps);

    expect(await getPerson(db, id)).toMatchObject({ name: 'Leyla', relation: { kind: 'preset', key: 'friend' } });
    const reminders = await db.all<{ days_before: number }>('SELECT days_before FROM reminders WHERE person_id = ? ORDER BY days_before', [id]);
    expect(reminders.map((r) => r.days_before)).toEqual([0, 7]);
  });

  it('uses the user\'s changed defaults', async () => {
    const db = await openTestDatabase();
    await ensureSettings(db);
    await updateRow(db, 'user_settings', 'me', { default_reminder_days: '[1,14]' }, deps);
    const id = await createPerson(db, input, deps);
    const reminders = await db.all<{ days_before: number }>('SELECT days_before FROM reminders WHERE person_id = ? ORDER BY days_before', [id]);
    expect(reminders.map((r) => r.days_before)).toEqual([1, 14]);
  });

  it('updates relation from preset to custom', async () => {
    const db = await openTestDatabase();
    const id = await createPerson(db, input, deps);
    await updatePerson(db, id, { ...input, relation: { kind: 'custom', text: 'Godmother' } }, deps);
    expect(await db.first('SELECT relation_key, relation_custom, dirty FROM people')).toEqual({
      relation_key: null,
      relation_custom: 'Godmother',
      dirty: 1,
    });
  });

  it('hides deleted people', async () => {
    const db = await openTestDatabase();
    const id = await createPerson(db, input, deps);
    await createPerson(db, { ...input, name: 'Ada' }, deps);
    await deletePerson(db, id, deps);
    expect((await listPeople(db)).map((p) => p.name)).toEqual(['Ada']);
    expect(await getPerson(db, id)).toBeNull();
  });
});
