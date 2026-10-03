import { AppState } from 'react-native';

import { onDataChange } from './changes';
import { openAppDatabase } from './openAppDatabase';
import { supabaseRemote } from './remote';
import { ensureSession } from './session';
import { supabase } from './supabase';
import { SyncError, syncOnce } from './sync';
import { appWriteDeps } from './appDeps';
import { ensureSettings } from './writes';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'local-only' | 'error';

const LOCAL_CHANGE_DELAY_MS = 2_000;

let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let status: SyncStatus = 'idle';

export function getSyncStatus(): SyncStatus {
  return status;
}

/** Runs one sync now, or queues one more if a sync is already running. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await runOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function runOnce(): Promise<void> {
  try {
    const db = await openAppDatabase();
    await ensureSettings(db);
    if (!supabase) {
      status = 'local-only';
      return;
    }
    const userId = await ensureSession(supabase);
    if (!userId) {
      status = 'offline';
      return;
    }
    status = 'syncing';
    await syncOnce(db, supabaseRemote(supabase, userId), userId, { newId: appWriteDeps.newId });
    status = 'idle';
  } catch (error) {
    status = error instanceof SyncError && error.kind === 'offline' ? 'offline' : 'error';
    if (status === 'error') console.warn('Sync failed', error);
  }
}

let started = false;

/** Call once at app start: syncs now, on foreground, and shortly after local edits. */
export function startSync(): void {
  if (started) return;
  started = true;
  void syncNow();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });
  onDataChange((_, source) => {
    if (source !== 'local') return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), LOCAL_CHANGE_DELAY_MS);
  });
}
