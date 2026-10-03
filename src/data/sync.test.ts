import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SqlDb } from './db';
import { getState, syncOnce, SyncError } from './sync';
import { FakeRemote } from './test/fakeRemote';
import { openTestDatabase } from './test/nodeSqlite';
import { deletePerson, ensureSettings, insertRow, nextTimestamp, updateRow, type WriteDeps } from './writes';

const ANON = 'aaaaaaaa-0000-0000-0000-000000000000';
const APPLE = 'bbbbbbbb-0000-0000-0000-000000000000';

function clockAt(iso: string): WriteDeps & { set(iso: string): void } {
  let now = new Date(iso);
  return { newId: randomUUID, now: () => now, set: (next) => (now = new Date(next)) };
}

const opts = { newId: randomUUID };
const person = (name: string) => ({ name, birth_day: 12, birth_month: 5 });

async function people(db: SqlDb) {
  return db.all<{ id: string; name: string; dirty: number; deleted_at: string | null; sync_error: string | null }>(
    'SELECT id, name, dirty, deleted_at, sync_error FROM people ORDER BY name',
  );
}

let server: FakeRemote;
let phone: SqlDb;
let ipad: SqlDb;
let clock: ReturnType<typeof clockAt>;

beforeEach(async () => {
  server = new FakeRemote();
  phone = await openTestDatabase();
  ipad = await openTestDatabase();
  clock = clockAt('2026-10-03T09:00:00Z');
});

describe('first launch offline', () => {
  it('keeps rows local until a session exists, then attaches them to the user', async () => {
    await insertRow(phone, 'people', person('Leyla'), clock);
    expect(server.rows('people')).toHaveLength(0);

    const result = await syncOnce(phone, server.forUser(ANON), ANON, opts);

    expect(result.pushed).toBe(1);
    expect(server.rows('people')[0]).toMatchObject({ name: 'Leyla', user_id: ANON });
    expect((await people(phone))[0].dirty).toBe(0);
  });

  it('keeps changes dirty when the network drops mid-sync', async () => {
    await insertRow(phone, 'people', person('Leyla'), clock);
    server.offline = true;
    await expect(syncOnce(phone, server.forUser(ANON), ANON, opts)).rejects.toMatchObject({ kind: 'offline' });
    expect((await people(phone))[0].dirty).toBe(1);

    server.offline = false;
    await syncOnce(phone, server.forUser(ANON), ANON, opts);
    expect((await people(phone))[0].dirty).toBe(0);
  });
});

describe('two devices', () => {
  it('copies a person and their children to the other device', async () => {
    const id = await insertRow(phone, 'people', person('Leyla'), clock);
    await insertRow(phone, 'reminders', { person_id: id, days_before: 7 }, clock);
    await insertRow(phone, 'gift_ideas', { person_id: id, title: 'Book', price: 12.5, bought: 1 }, clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);

    await syncOnce(ipad, server.forUser(ANON), ANON, opts);

    expect(await people(ipad)).toMatchObject([{ id, name: 'Leyla', dirty: 0 }]);
    expect(await ipad.all('SELECT days_before FROM reminders')).toEqual([{ days_before: 7 }]);
    expect(await ipad.all('SELECT title, price, bought FROM gift_ideas')).toEqual([{ title: 'Book', price: 12.5, bought: 1 }]);
  });

  it('resolves conflicting offline edits by last write, whichever device syncs first', async () => {
    const id = await insertRow(phone, 'people', person('Leyla'), clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);
    await syncOnce(ipad, server.forUser(ANON), ANON, opts);

    clock.set('2026-10-03T10:00:00Z');
    await updateRow(phone, 'people', id, { name: 'Phone edit' }, clock);
    clock.set('2026-10-03T11:00:00Z');
    await updateRow(ipad, 'people', id, { name: 'iPad edit (later)' }, clock);

    // The later edit syncs first; the older one must not overwrite it.
    await syncOnce(ipad, server.forUser(ANON), ANON, opts);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);
    await syncOnce(ipad, server.forUser(ANON), ANON, opts);

    expect(server.rows('people')[0].name).toBe('iPad edit (later)');
    expect((await people(phone))[0]).toMatchObject({ name: 'iPad edit (later)', dirty: 0 });
    expect((await people(ipad))[0]).toMatchObject({ name: 'iPad edit (later)', dirty: 0 });
  });

  it('propagates a deleted person and their children as tombstones', async () => {
    const id = await insertRow(phone, 'people', person('Leyla'), clock);
    await insertRow(phone, 'gift_ideas', { person_id: id, title: 'Book' }, clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);
    await syncOnce(ipad, server.forUser(ANON), ANON, opts);

    clock.set('2026-10-03T10:00:00Z');
    await deletePerson(phone, id, clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);
    await syncOnce(ipad, server.forUser(ANON), ANON, opts);

    expect((await people(ipad))[0].deleted_at).toBe('2026-10-03T10:00:00.000Z');
    expect(await ipad.all('SELECT deleted_at FROM gift_ideas')).toEqual([{ deleted_at: '2026-10-03T10:00:00.000Z' }]);
  });
});

describe('push safety', () => {
  it('leaves a row dirty if it was edited while its push was in flight', async () => {
    const id = await insertRow(phone, 'people', person('Leyla'), clock);
    const remote = server.forUser(ANON);
    let edited = false;
    const racing = {
      ...remote,
      upsert: async (...args: Parameters<typeof remote.upsert>) => {
        await remote.upsert(...args);
        if (!edited && args[0] === 'people') {
          edited = true;
          clock.set('2026-10-03T09:00:05Z');
          await updateRow(phone, 'people', id, { name: 'Edited during push' }, clock);
        }
      },
    };

    await syncOnce(phone, racing, ANON, opts);

    // The edit was pushed in the next round, not lost.
    expect(server.rows('people')[0].name).toBe('Edited during push');
    expect((await people(phone))[0]).toMatchObject({ name: 'Edited during push', dirty: 0 });
  });

  it('isolates a row the server rejects so the rest still sync', async () => {
    server.reject = (_, row) => (row.name === 'BAD' ? '23514: check constraint' : null);
    await insertRow(phone, 'people', person('Ada'), clock);
    const bad = await insertRow(phone, 'people', person('BAD'), clock);
    await insertRow(phone, 'people', person('Zoe'), clock);

    const result = await syncOnce(phone, server.forUser(ANON), ANON, opts);

    expect(result).toMatchObject({ pushed: 2, rejected: 1 });
    expect(server.rows('people').map((r) => r.name).sort()).toEqual(['Ada', 'Zoe']);
    expect((await people(phone)).find((p) => p.id === bad)?.sync_error).toContain('23514');

    // Fixing the row locally clears the error and it syncs.
    clock.set('2026-10-03T09:01:00Z');
    await updateRow(phone, 'people', bad, { name: 'Fixed' }, clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);
    expect(server.rows('people').map((r) => r.name).sort()).toEqual(['Ada', 'Fixed', 'Zoe']);
  });
});

describe('pulling', () => {
  it('pages through many rows and only re-reads a small overlap afterwards', async () => {
    for (let i = 0; i < 23; i++) await insertRow(phone, 'people', person(`P${String(i).padStart(2, '0')}`), clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);

    const first = await syncOnce(ipad, server.forUser(ANON), ANON, { ...opts, pullPageSize: 5 });
    expect(first.pulled).toBe(23);
    expect(await getState(ipad, 'cursor:people')).toBeTruthy();

    await insertRow(phone, 'people', person('New'), clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);
    const second = await syncOnce(ipad, server.forUser(ANON), ANON, { ...opts, pullPageSize: 5 });
    expect(second.pulled).toBe(1);
    expect(await people(ipad)).toHaveLength(24);
  });
});

describe('switching accounts', () => {
  it('merges local data into an existing account and pulls that account from scratch', async () => {
    // Existing account (from a previous install) with one person and settings.
    const oldPhone = await openTestDatabase();
    await insertRow(oldPhone, 'people', person('From old install'), clock);
    await ensureSettings(oldPhone);
    await updateRow(oldPhone, 'user_settings', 'me', { reminder_time: '08:00' }, clock);
    await syncOnce(oldPhone, server.forUser(APPLE), APPLE, opts);

    // New install: works anonymously first.
    clock.set('2026-10-03T12:00:00Z');
    await ensureSettings(phone);
    await insertRow(phone, 'people', person('Added on new install'), clock);
    await syncOnce(phone, server.forUser(ANON), ANON, opts);

    // Sign in with Apple lands on the existing account.
    await syncOnce(phone, server.forUser(APPLE), APPLE, opts);

    const names = (await people(phone)).map((p) => p.name);
    expect(names).toEqual(['Added on new install', 'From old install']);
    expect(server.rows('people').filter((r) => r.user_id === APPLE)).toHaveLength(2);
    // Fresh-install defaults did not overwrite the account's real settings.
    expect(await phone.first('SELECT reminder_time FROM user_settings')).toEqual({ reminder_time: '08:00' });
    expect(server.rows('user_settings').find((r) => r.user_id === APPLE)?.reminder_time).toBe('08:00');
  });
});

describe('nextTimestamp', () => {
  it('never goes backwards when the device clock does', () => {
    expect(nextTimestamp(new Date('2026-10-03T09:00:00Z'), '2026-10-03T10:00:00.000Z')).toBe('2026-10-03T10:00:00.001Z');
    expect(nextTimestamp(new Date('2026-10-03T11:00:00Z'), '2026-10-03T10:00:00.000Z')).toBe('2026-10-03T11:00:00.000Z');
  });
});

describe('writes', () => {
  it('refuses to write sync-managed columns directly', async () => {
    await expect(insertRow(phone, 'people', { ...person('X'), updated_at: 'x' }, clock)).rejects.toThrow(/updated_at/);
    await expect(insertRow(phone, 'people', { ...person('X'), dirty: 0 }, clock)).rejects.toThrow(/dirty/);
  });

  it('exposes SyncError kinds for the runner', () => {
    expect(new SyncError('x', 'offline').kind).toBe('offline');
  });
});
