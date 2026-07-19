import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient as createAnonServerClient } from '@/lib/supabase-server';

/**
 * Accesso dati con scope utente obbligatorio.
 * Continua a usare service_role (NextAuth ≠ Supabase Auth), ma obbliga
 * a passare userId e documenta i path “system-only”.
 */

export type ScopedSupabase = {
  userId: string;
  /** Client admin — usalo solo con filtri .eq('user_id' | 'creator_id', userId). */
  db: SupabaseClient;
};

export function scopedForUser(userId: string): ScopedSupabase {
  if (!userId?.trim()) {
    throw new Error('scopedForUser: userId obbligatorio');
  }
  return { userId, db: supabaseAdmin };
}

/** Solo job di sistema (worker, cron, GDPR admin). Preferisci scopedForUser. */
export function systemAdmin(): SupabaseClient {
  return supabaseAdmin;
}

/**
 * Letture pubbliche (lista trip) via anon + RLS.
 * Fallback ad admin se anon fallisce (schema legacy).
 */
export async function publicReadsClient(): Promise<SupabaseClient> {
  try {
    return await createAnonServerClient();
  } catch {
    return supabaseAdmin;
  }
}
