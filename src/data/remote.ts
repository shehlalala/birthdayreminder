import type { SupabaseClient } from '@supabase/supabase-js';

import { SyncError, type RemoteStore } from './sync';

// RemoteStore backed by Supabase (PostgREST). RLS limits every query to the
// signed-in user's rows; the user_id filter is there for the index.

interface PostgrestFailure {
  message: string;
  code?: string;
}

/** 4xx except auth/timeouts/rate limits means the data itself was refused. */
function toSyncError(error: PostgrestFailure, status: number): SyncError {
  const transient = status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
  return new SyncError(`${error.code ?? status}: ${error.message}`, transient ? 'offline' : 'rejected');
}

/** Network failures surface as thrown errors from fetch; treat as offline. */
async function guard<T>(fn: () => PromiseLike<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SyncError) throw error;
    throw new SyncError(String(error), 'offline');
  }
}

export function supabaseRemote(client: SupabaseClient, userId: string): RemoteStore {
  return {
    async upsert(table, key, rows) {
      const { error, status } = await guard(() => client.from(table).upsert(rows, { onConflict: key }));
      if (error) throw toSyncError(error, status);
    },

    async pullPage(table, key, after, limit) {
      let query = client
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('synced_at', { ascending: true })
        .order(key, { ascending: true })
        .limit(limit);
      if (after) {
        const at = `"${after.syncedAt}"`;
        query = query.or(`synced_at.gt.${at},and(synced_at.eq.${at},${key}.gt.${after.key})`);
      }
      const { data, error, status } = await guard(() => query);
      if (error) throw toSyncError(error, status);
      return data ?? [];
    },
  };
}
