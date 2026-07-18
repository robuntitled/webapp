import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { GooglePlaceResult } from '@/lib/places/google-text-search';
import type { PlaceCategoryId } from '@/lib/places/place-categories';

/**
 * Cache Places **senza scadenza** e **condivisa tra tutti gli utenti**.
 * Chiave: zona + categoria + query + lingua (non legata a user_id).
 */
export function buildPlacesCacheKey(options: {
  lat: number;
  lng: number;
  category: PlaceCategoryId;
  query: string;
  language?: string;
}): string {
  const lat = roundCoord(options.lat);
  const lng = roundCoord(options.lng);
  const q = options.query.trim().toLowerCase().slice(0, 80);
  const lang = options.language ?? 'it';
  // v2: risultati con rating + photoUrl (invalida cache senza media)
  return `${lat},${lng}|${options.category}|${q}|${lang}|v2`;
}

function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Legge cache DB. Nessun TTL: se c’è, vale per sempre (per tutti).
 * Fail-open: errori → null (si va su Google).
 */
export async function getPlacesFromDbCache(
  cacheKey: string
): Promise<GooglePlaceResult[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('places_search_cache')
      .select('results, hit_count')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    const results = data.results;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Best-effort hit counter
    const prev =
      typeof data.hit_count === 'number' && Number.isFinite(data.hit_count)
        ? data.hit_count
        : 0;
    void supabaseAdmin
      .from('places_search_cache')
      .update({ hit_count: prev + 1 })
      .eq('cache_key', cacheKey);

    return results as GooglePlaceResult[];
  } catch {
    return null;
  }
}

/**
 * Scrive / aggiorna cache condivisa (qualsiasi utente successivo la riusa).
 */
export async function setPlacesDbCache(options: {
  cacheKey: string;
  lat: number;
  lng: number;
  category: PlaceCategoryId;
  query: string;
  results: GooglePlaceResult[];
  language?: string;
}): Promise<void> {
  if (options.results.length === 0) return;

  try {
    const lat = roundCoord(options.lat);
    const lng = roundCoord(options.lng);
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin.from('places_search_cache').upsert(
      {
        cache_key: options.cacheKey,
        lat,
        lng,
        category: options.category,
        query: options.query.trim().toLowerCase().slice(0, 80),
        language: options.language ?? 'it',
        results: options.results,
        updated_at: now,
      },
      { onConflict: 'cache_key' }
    );

    if (error) {
      console.warn('[places-db-cache] upsert failed:', error.message);
    }
  } catch (e) {
    console.warn('[places-db-cache] upsert error:', e);
  }
}
