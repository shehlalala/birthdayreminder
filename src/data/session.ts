import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the signed-in user's id, creating an anonymous account the first
 * time the device is online. Returns null when offline or not configured;
 * the app keeps working locally and the next sync attaches the rows.
 */
export async function ensureSession(client: SupabaseClient | null): Promise<string | null> {
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: created, error } = await client.auth.signInAnonymously();
    if (error) return null;
    return created.user?.id ?? null;
  } catch {
    return null;
  }
}
