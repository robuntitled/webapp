/**
 * Cache + fetch client per ricerca luoghi (Aggiungi).
 * Condivisa tra modal e prefetch del piano → meno chiamate Google.
 */
import type { ActivityResultItem } from '@/components/composer/plan-v3/ActivityResultCard';
import { haversineKm } from '@/lib/maps/distance';
import type { PlaceCategoryId } from '@/lib/places/place-categories';
import { getPlaceCategory } from '@/lib/places/place-categories';

export type PlacesSearchBounds = {
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
};

type CacheEntry = { at: number; items: ActivityResultItem[] };

const CLIENT_TTL_MS = 45 * 60_000; // 45 min
const clientCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ActivityResultItem[]>>();

export function placesCacheKey(
  boundsKey: string,
  category: PlaceCategoryId,
  q: string
): string {
  return `${boundsKey}|${category}|${q.trim().toLowerCase()}`;
}

export function boundsCacheKey(bounds: PlacesSearchBounds[]): string {
  const p = bounds[0];
  if (!p) return '';
  return `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
}

export function getCachedPlaces(key: string): ActivityResultItem[] | null {
  const hit = clientCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CLIENT_TTL_MS) {
    clientCache.delete(key);
    return null;
  }
  return hit.items;
}

export function setCachedPlaces(key: string, items: ActivityResultItem[]) {
  if (items.length === 0) return;
  clientCache.set(key, { at: Date.now(), items });
}

/**
 * Minimo caratteri per ricerca testuale (evita spam su "p", "pi", "piz"…).
 * Query vuota = browse categoria area (sempre consentita).
 */
export const MIN_SEARCH_CHARS = 3;

export type FetchPlacesResult = {
  items: ActivityResultItem[];
  fromCache: boolean;
  warning?: string;
  error?: string;
};

/**
 * Fetch luoghi con cache + dedup richieste identiche in volo.
 */
export async function fetchPlacesForComposer(options: {
  q: string;
  category: PlaceCategoryId;
  bounds: PlacesSearchBounds[];
  signal?: AbortSignal;
}): Promise<FetchPlacesResult> {
  const { q, category, bounds, signal } = options;
  const trimmed = q.trim();
  const bKey = boundsCacheKey(bounds);
  const cacheKey = placesCacheKey(bKey, category, trimmed);

  const cached = getCachedPlaces(cacheKey);
  if (cached) {
    return { items: cached, fromCache: true };
  }

  // Non chiamare Google per 1–2 caratteri
  if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_CHARS) {
    return {
      items: [],
      fromCache: false,
      warning: `Digita almeno ${MIN_SEARCH_CHARS} caratteri per cercare.`,
    };
  }

  const existing = inflight.get(cacheKey);
  if (existing) {
    try {
      const items = await existing;
      return { items, fromCache: false };
    } catch {
      // rifai sotto
    }
  }

  const promise = (async () => {
    const res = await fetch('/api/places/google-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: trimmed,
        category,
        bounds,
      }),
      signal,
    });

    const data = (await res.json()) as {
      results?: {
        id: string;
        label: string;
        subtitle: string;
        lat: number;
        lng: number;
        placeTypeLabel: string;
      }[];
      warning?: string;
      error?: string;
    };

    if (!res.ok) {
      throw new Error(data.error ?? 'Ricerca non disponibile');
    }

    const center = bounds[0];
    const catLabel = getPlaceCategory(category).label;
    const mapped: ActivityResultItem[] = (data.results ?? []).map((p) => ({
      id: p.id,
      title: p.label,
      subtitle: p.subtitle || p.placeTypeLabel,
      category: p.placeTypeLabel || catLabel,
      lat: p.lat,
      lng: p.lng,
      distanceKm: center
        ? haversineKm(center, { lat: p.lat, lng: p.lng })
        : undefined,
    }));
    mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    setCachedPlaces(cacheKey, mapped);
    return mapped;
  })();

  inflight.set(cacheKey, promise);
  try {
    const items = await promise;
    return { items, fromCache: false };
  } finally {
    inflight.delete(cacheKey);
  }
}

/** Prefetch silenzioso (es. Attrazioni all’ingresso del piano). */
export function prefetchPlacesForComposer(options: {
  category: PlaceCategoryId;
  bounds: PlacesSearchBounds[];
}): void {
  if (options.bounds.length === 0) return;
  const key = placesCacheKey(boundsCacheKey(options.bounds), options.category, '');
  if (getCachedPlaces(key)) return;
  void fetchPlacesForComposer({
    q: '',
    category: options.category,
    bounds: options.bounds,
  }).catch(() => undefined);
}
