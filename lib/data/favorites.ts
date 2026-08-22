import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

/** Carica i trip_id preferiti via service_role (NextAuth ≠ Supabase auth.uid()). */
export async function loadFavoriteTripIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data, error } = await supabaseAdmin
    .from('favorite_trips')
    .select('trip_id')
    .eq('user_id', userId);
  if (error) {
    console.error('[favorites] loadFavoriteTripIds:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.trip_id as string));
}

export async function loadFavoriteItineraryIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data, error } = await supabaseAdmin
    .from('favorite_itineraries')
    .select('template_id')
    .eq('user_id', userId);
  if (error) {
    if (error.code === '42P01') return new Set();
    console.error('[favorites] loadFavoriteItineraryIds:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.template_id as string));
}
