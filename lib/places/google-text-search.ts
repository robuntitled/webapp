import 'server-only';

import { haversineKm } from '@/lib/maps/distance';
import {
  getPlaceCategory,
  labelForGoogleType,
  type PlaceCategoryId,
} from '@/lib/places/place-categories';

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
};

type Bounds = { lat: number; lng: number; radiusKm?: number; label?: string };

export type GooglePlacesSearchResult = {
  ok: boolean;
  results: GooglePlaceResult[];
  status: string;
  errorMessage?: string;
};

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types';

type PlacesApiPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
};

type CacheEntry = { at: number; result: GooglePlacesSearchResult };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 8 * 60_000;
const CACHE_MAX = 120;

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
}

function placeTypeLabel(place: PlacesApiPlace): string {
  return labelForGoogleType(place.primaryType || place.types?.[0]);
}

function mapPlaces(
  places: PlacesApiPlace[],
  bounds: Bounds[],
  maxRadiusKm: number,
  limit: number,
  categoryTypes?: string[]
): GooglePlaceResult[] {
  const centers = bounds.map((b) => ({ lat: b.lat, lng: b.lng }));
  const typeSet = categoryTypes?.length ? new Set(categoryTypes) : null;
  const out: GooglePlaceResult[] = [];

  for (const place of places) {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    const name = place.displayName?.text?.trim();
    if (lat == null || lng == null || !name) continue;

    const minDist = Math.min(...centers.map((c) => haversineKm(c, { lat, lng })));
    if (minDist > maxRadiusKm) continue;

    const types = place.types ?? [];
    const primary = place.primaryType;

    // Soft filter: se Google ha restituito tipi, preferisci match categoria
    if (typeSet) {
      const hits =
        (primary && typeSet.has(primary)) || types.some((t) => typeSet.has(t));
      // Se non c'è match ma Google ha già filtrato via includedTypes, tieni comunque
      // Solo scarta se ha tipi e nessuno è in categoria e non è POI generico solo
      if (!hits && types.length > 0 && primary && !typeSet.has(primary)) {
        // tieni se includedTypes era applicato a monte — qui filtriamo solo junk
        const junk = ['political', 'locality', 'route', 'plus_code', 'geocode'];
        if (types.every((t) => junk.includes(t))) continue;
      }
    }

    out.push({
      id: place.id || `g-${lat.toFixed(5)}-${lng.toFixed(5)}`,
      label: name,
      subtitle: place.formattedAddress ?? '',
      lat,
      lng,
      placeTypeLabel: placeTypeLabel(place),
      primaryType: primary,
      types,
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
  timeoutMs = 4_500
): Promise<{ ok: boolean; places: PlacesApiPlace[]; status: string; errorMessage?: string }> {
  if (!API_KEY) {
    return { ok: false, places: [], status: 'MISSING_API_KEY' };
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

/**
 * Nearby per categoria (bottoni). Una chiamata, tipi Google della tab.
 */
export async function searchGooglePlacesNearby(
  bounds: Bounds[],
  maxRadiusKm = 25,
  limit = 14,
  categoryId?: PlaceCategoryId | null
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };
  if (bounds.length === 0) return { ok: false, results: [], status: 'INVALID_REQUEST' };

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
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 1500), 25_000);
  const locationCircle = {
    circle: {
      center: { latitude: primary.lat, longitude: primary.lng },
      radius: radiusM,
    },
  };

  const result = await placesPost('places:searchNearby', {
    includedTypes,
    maxResultCount: Math.min(limit, 20),
    rankPreference: 'POPULARITY',
    languageCode: 'it',
    locationRestriction: locationCircle,
  });

  // Fallback: text search con tipo primario della categoria
  if (!result.ok || result.places.length === 0) {
    const textQuery = cat
      ? primary.label
        ? `${cat.textBoost ?? cat.label} a ${primary.label}`
        : (cat.textBoost ?? cat.label)
      : primary.label
        ? `attrazioni e ristoranti a ${primary.label}`
        : 'attrazioni e ristoranti';

    const textBody: Record<string, unknown> = {
      textQuery,
      languageCode: 'it',
      maxResultCount: Math.min(limit, 20),
      locationBias: locationCircle,
    };
    if (cat?.textIncludedType) {
      textBody.includedType = cat.textIncludedType;
    }

    const text = await placesPost('places:searchText', textBody);
    if (text.ok && text.places.length > 0) {
      const mapped = {
        ok: true as const,
        results: mapPlaces(text.places, bounds, maxRadiusKm, limit, includedTypes),
        status: text.status,
      };
      cacheSet(cacheKey, mapped);
      return mapped;
    }
    return {
      ok: false,
      results: [],
      status: result.status,
      errorMessage: result.errorMessage,
    };
  }

  const mapped = {
    ok: true as const,
    results: mapPlaces(result.places, bounds, maxRadiusKm, limit, includedTypes),
    status: result.status,
  };
  cacheSet(cacheKey, mapped);
  return mapped;
}

/**
 * Text Search nella categoria: includedType Google + bias area.
 */
export async function searchGooglePlacesInBounds(
  query: string,
  bounds: Bounds[],
  maxRadiusKm = 60,
  categoryId?: PlaceCategoryId | null
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };
  if (query.trim().length < 2 || bounds.length === 0) {
    return { ok: false, results: [], status: 'INVALID_REQUEST' };
  }

  const primary = bounds[0];
  const cat = categoryId ? getPlaceCategory(categoryId) : null;
  const q = query.trim();
  const cacheKey = `tx:${categoryId ?? 'all'}:${primary.lat.toFixed(3)},${primary.lng.toFixed(3)}:${q.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 2000), 40_000);

  const body: Record<string, unknown> = {
    textQuery: q,
    languageCode: 'it',
    maxResultCount: 14,
    locationBias: {
      circle: {
        center: { latitude: primary.lat, longitude: primary.lng },
        radius: radiusM,
      },
    },
  };

  if (cat?.textIncludedType) {
    body.includedType = cat.textIncludedType;
  }

  const result = await placesPost('places:searchText', body);

  // Se includedType stringe troppo, ritenta senza tipo ma con boost testuale
  if ((!result.ok || result.places.length === 0) && cat) {
    const retry = await placesPost('places:searchText', {
      textQuery: `${q} ${cat.textBoost ?? cat.label}`,
      languageCode: 'it',
      maxResultCount: 14,
      locationBias: body.locationBias,
    });
    if (retry.ok && retry.places.length > 0) {
      const mapped = {
        ok: true as const,
        results: mapPlaces(retry.places, bounds, maxRadiusKm, 14, cat.googleTypes),
        status: retry.status,
      };
      cacheSet(cacheKey, mapped);
      return mapped;
    }
  }

  if (!result.ok) {
    return { ok: false, results: [], status: result.status, errorMessage: result.errorMessage };
  }

  const mapped = {
    ok: true as const,
    results: mapPlaces(result.places, bounds, maxRadiusKm, 14, cat?.googleTypes),
    status: result.status,
  };
  cacheSet(cacheKey, mapped);
  return mapped;
}

export function hasGooglePlacesKey(): boolean {
  return Boolean(API_KEY);
}
