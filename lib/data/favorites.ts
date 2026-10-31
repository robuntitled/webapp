import 'server-only';

import { scopedForUser } from '@/lib/supabase-scoped';

export async function loadFavoriteItineraryIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const { db } = scopedForUser(userId);
  const { data, error } = await db
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
