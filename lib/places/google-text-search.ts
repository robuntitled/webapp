import 'server-only';

import { haversineKm } from '@/lib/maps/distance';
import {
  getPlaceCategory,
  labelForGoogleType,
  type PlaceCategoryId,
} from '@/lib/places/place-categories';
import { redisGetJson, redisSetJson } from '@/lib/redis/upstash';

/**
 * Solo Places API (New) — places.googleapis.com/v1
 * Non usa più Text Search legacy (maps.googleapis.com/maps/api/place/...).
 */
const API_KEY =
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  '';

export type GooglePlaceResult = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeTypeLabel: string;
  primaryType?: string;
  types?: string[];
  rating?: number | null;
  ratingCount?: number | null;
  /** Resource name Places API New (photos/…) */
  photoName?: string | null;
  /** Proxy URL /api/places/photo */
  photoUrl?: string | null;
};

type Bounds = { lat: number; lng: number; radiusKm?: number; label?: string };

export type GooglePlacesSearchResult = {
  ok: boolean;
  results: GooglePlaceResult[];
  status: string;
  errorMessage?: string;
};

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.userRatingCount,places.photos';

const SETUP_HINT =
  'Abilita «Places API (New)» in Google Cloud e sulla API key (API restrictions). ' +
  'Per chiamate da Vercel: Application restriction = None, oppure usa GOOGLE_MAPS_API_KEY dedicata.';

type PlacesApiPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{ name?: string }>;
};

type CacheEntry = { at: number; result: GooglePlacesSearchResult };
const cache = new Map<string, CacheEntry>();
/** Cache server lunga: meno chiamate Google su istanze warm Vercel. */
const CACHE_TTL_MS = 45 * 60_000;
const CACHE_MAX = 200;
/** Dedup: stessa key in volo → una sola chiamata Google. */
const inflight = new Map<string, Promise<GooglePlacesSearchResult>>();

/** Evita di ritentare metodi bloccati dalla key. */
let nearbyBlocked = false;
let textSearchBlocked = false;

function placesRedisKey(key: string): string {
  return `places:g:${key}`;
}

function isBlockedError(status: string, message?: string): boolean {
  const m = (message || '').toLowerCase();
  const s = (status || '').toUpperCase();
  return (
    s === 'PERMISSION_DENIED' ||
    s === 'API_KEY_SERVICE_BLOCKED' ||
    s.includes('BLOCKED') ||
    m.includes('blocked') ||
    m.includes('permission') ||
    m.includes('not authorized') ||
    m.includes('api keys with referer') ||
    m.includes('referer restrictions') ||
    m.includes('has not been used') ||
    m.includes('is disabled') ||
    m.includes('not enabled') ||
    m.includes('legacy') ||
    m.includes('not been activated')
  );
}

function cacheGet(key: string): GooglePlacesSearchResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.result;
}

function cacheSet(key: string, result: GooglePlacesSearchResult) {
  if (!result.ok || result.results.length === 0) return;
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { at: Date.now(), result });
  void redisSetJson(placesRedisKey(key), result, CACHE_TTL_MS);
}

async function withInflight(
  key: string,
  run: () => Promise<GooglePlacesSearchResult>
): Promise<GooglePlacesSearchResult> {
  const cached = cacheGet(key);
  if (cached) return cached;

  const remote = await redisGetJson<GooglePlacesSearchResult>(placesRedisKey(key));
  if (remote?.ok && remote.results.length > 0) {
    cacheSetMemoryOnly(key, remote);
    return remote;
  }

  const pending = inflight.get(key);
  if (pending) return pending;
  const p = run().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function cacheSetMemoryOnly(key: string, result: GooglePlacesSearchResult) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { at: Date.now(), result });
}

function placeTypeLabel(place: PlacesApiPlace): string {
  return labelForGoogleType(place.primaryType || place.types?.[0]);
}

function mapPlaces(
  places: PlacesApiPlace[],
  bounds: Bounds[],
  maxRadiusKm: number,
  limit: number
): GooglePlaceResult[] {
  const centers = bounds.map((b) => ({ lat: b.lat, lng: b.lng }));
  const out: GooglePlaceResult[] = [];

  for (const place of places) {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    const name = place.displayName?.text?.trim();
    if (lat == null || lng == null || !name) continue;

    const minDist = Math.min(...centers.map((c) => haversineKm(c, { lat, lng })));
    if (minDist > maxRadiusKm) continue;

    const photoName = place.photos?.[0]?.name?.trim() || null;
    const rating = typeof place.rating === 'number' ? place.rating : null;
    const ratingCount =
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null;

    out.push({
      id: place.id || `g-${lat.toFixed(5)}-${lng.toFixed(5)}`,
      label: name,
      subtitle: place.formattedAddress ?? '',
      lat,
      lng,
      placeTypeLabel: placeTypeLabel(place),
      primaryType: place.primaryType,
      types: place.types,
      rating,
      ratingCount,
      photoName,
      photoUrl: photoName
        ? `/api/places/photo?name=${encodeURIComponent(photoName)}&h=200`
        : null,
    });
    if (out.length >= limit) break;
  }

  out.sort((a, b) => {
    const da = Math.min(...centers.map((c) => haversineKm(c, a)));
    const db = Math.min(...centers.map((c) => haversineKm(c, b)));
    return da - db;
  });

  return out;
}

async function placesPost(
  path: 'places:searchText' | 'places:searchNearby',
  body: Record<string, unknown>,
  timeoutMs = 5_000
): Promise<{ ok: boolean; places: PlacesApiPlace[]; status: string; errorMessage?: string }> {
  if (!API_KEY) {
    return { ok: false, places: [], status: 'MISSING_API_KEY', errorMessage: SETUP_HINT };
  }

  try {
    const res = await fetch(`https://places.googleapis.com/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = (await res.json().catch(() => ({}))) as {
      places?: PlacesApiPlace[];
      error?: { message?: string; status?: string };
    };

    if (!res.ok) {
      return {
        ok: false,
        places: [],
        status: data.error?.status || `HTTP_${res.status}`,
        errorMessage: data.error?.message,
      };
    }

    return {
      ok: true,
      places: data.places ?? [],
      status: (data.places?.length ?? 0) > 0 ? 'OK' : 'ZERO_RESULTS',
    };
  } catch (e) {
    return {
      ok: false,
      places: [],
      status: 'NETWORK_ERROR',
      errorMessage: e instanceof Error ? e.message : 'timeout',
    };
  }
}

function locationCircle(primary: Bounds, radiusM: number) {
  return {
    circle: {
      center: { latitude: primary.lat, longitude: primary.lng },
      radius: radiusM,
    },
  };
}

/**
 * Browse area per categoria — solo Places API (New).
 * Preferisce Text Search (più spesso abilitato); Nearby se disponibile.
 */
export async function searchGooglePlacesNearby(
  bounds: Bounds[],
  maxRadiusKm = 25,
  limit = 14,
  categoryId?: PlaceCategoryId | null
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) {
    return { ok: false, results: [], status: 'MISSING_API_KEY', errorMessage: SETUP_HINT };
  }
  if (bounds.length === 0) {
    return { ok: false, results: [], status: 'INVALID_REQUEST' };
  }

  const primary = bounds[0];
  const cat = categoryId ? getPlaceCategory(categoryId) : null;
  const includedTypes = cat?.googleTypes ?? [
    'tourist_attraction',
    'museum',
    'restaurant',
    'cafe',
    'park',
  ];

  const cacheKey = `nb:${categoryId ?? 'all'}:${primary.lat.toFixed(3)},${primary.lng.toFixed(3)}:${limit}`;

  return withInflight(cacheKey, async () => {
    const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 1500), 25_000);
    const circle = locationCircle(primary, radiusM);

    // Una sola Text Search (no retry extra) → max 1 chiamata nella maggior parte dei casi
    if (!textSearchBlocked) {
      const textQuery = cat
        ? primary.label
          ? `${cat.textBoost ?? cat.label} a ${primary.label}`
          : (cat.textBoost ?? cat.label)
        : primary.label
          ? `attrazioni a ${primary.label}`
          : 'attrazioni ristoranti';

      const textBody: Record<string, unknown> = {
        textQuery,
        languageCode: 'it',
        maxResultCount: Math.min(limit, 20),
        locationBias: circle,
      };
      if (cat?.textIncludedType) {
        textBody.includedType = cat.textIncludedType;
      }

      const text = await placesPost('places:searchText', textBody);
      if (text.ok && text.places.length > 0) {
        const mapped = {
          ok: true as const,
          results: mapPlaces(text.places, bounds, maxRadiusKm, limit),
          status: text.status,
        };
        cacheSet(cacheKey, mapped);
        return mapped;
      }

      if (isBlockedError(text.status, text.errorMessage)) {
        textSearchBlocked = true;
        nearbyBlocked = true;
        return {
          ok: false,
          results: [],
          status: text.status,
          errorMessage: `${text.errorMessage || 'Places API (New) bloccata.'} ${SETUP_HINT}`,
        };
      }
    }

    // Nearby solo se Text ha 0 risultati (seconda chiamata, raramente)
    if (!nearbyBlocked) {
      const nearby = await placesPost('places:searchNearby', {
        includedTypes,
        maxResultCount: Math.min(limit, 20),
        rankPreference: 'POPULARITY',
        languageCode: 'it',
        locationRestriction: circle,
      });

      if (nearby.ok && nearby.places.length > 0) {
        const mapped = {
          ok: true as const,
          results: mapPlaces(nearby.places, bounds, maxRadiusKm, limit),
          status: nearby.status,
        };
        cacheSet(cacheKey, mapped);
        return mapped;
      }

      if (isBlockedError(nearby.status, nearby.errorMessage)) {
        nearbyBlocked = true;
      }
    }

    if (textSearchBlocked) {
      return {
        ok: false,
        results: [],
        status: 'PERMISSION_DENIED',
        errorMessage: SETUP_HINT,
      };
    }

    return { ok: true, results: [], status: 'ZERO_RESULTS' };
  });
}

/**
 * Ricerca testuale — solo Places API (New) searchText.
 */
export async function searchGooglePlacesInBounds(
  query: string,
  bounds: Bounds[],
  maxRadiusKm = 60,
  categoryId?: PlaceCategoryId | null
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) {
    return { ok: false, results: [], status: 'MISSING_API_KEY', errorMessage: SETUP_HINT };
  }
  // Min 3 caratteri lato server (allineato al client)
  if (query.trim().length < 3 || bounds.length === 0) {
    return { ok: false, results: [], status: 'INVALID_REQUEST' };
  }

  const primary = bounds[0];
  const cat = categoryId ? getPlaceCategory(categoryId) : null;
  const q = query.trim();
  const cacheKey = `tx:${categoryId ?? 'all'}:${primary.lat.toFixed(3)},${primary.lng.toFixed(3)}:${q.toLowerCase()}`;

  return withInflight(cacheKey, async () => {
    if (textSearchBlocked) {
      return {
        ok: false,
        results: [],
        status: 'PERMISSION_DENIED',
        errorMessage: SETUP_HINT,
      };
    }

    const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 2000), 40_000);
    const locationBias = locationCircle(primary, radiusM);

    // Una sola Text Search: includedType se c'è categoria (niente doppio retry)
    const body: Record<string, unknown> = {
      textQuery: cat ? `${q} ${cat.textBoost ?? ''}`.trim() : q,
      languageCode: 'it',
      maxResultCount: 14,
      locationBias,
    };
    if (cat?.textIncludedType) {
      body.includedType = cat.textIncludedType;
    }

    const result = await placesPost('places:searchText', body);

    if (result.ok && result.places.length > 0) {
      const mapped = {
        ok: true as const,
        results: mapPlaces(result.places, bounds, maxRadiusKm, 14),
        status: result.status,
      };
      cacheSet(cacheKey, mapped);
      return mapped;
    }

    if (isBlockedError(result.status, result.errorMessage)) {
      textSearchBlocked = true;
      nearbyBlocked = true;
      return {
        ok: false,
        results: [],
        status: result.status,
        errorMessage: `${result.errorMessage || 'Places API (New) bloccata.'} ${SETUP_HINT}`,
      };
    }

    return { ok: true, results: [], status: 'ZERO_RESULTS' };
  });
}

export function hasGooglePlacesKey(): boolean {
  return Boolean(API_KEY);
}
