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

/** Se Nearby/New è bloccato dalla key, non riprovare ogni volta. */
let nearbyBlocked = false;
let placesNewBlocked = false;

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
    m.includes('not enabled')
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

    out.push({
      id: place.id || `g-${lat.toFixed(5)}-${lng.toFixed(5)}`,
      label: name,
      subtitle: place.formattedAddress ?? '',
      lat,
      lng,
      placeTypeLabel: placeTypeLabel(place),
      primaryType: place.primaryType,
      types: place.types,
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

/** Mappa type Google → type legacy Text Search (uno solo). */
function legacyTypeForCategory(categoryId?: PlaceCategoryId | null): string | undefined {
  if (!categoryId) return undefined;
  const map: Record<PlaceCategoryId, string> = {
    attraction: 'tourist_attraction',
    meal: 'restaurant',
    activity: 'spa',
    shopping: 'shopping_mall',
    hotel: 'lodging',
  };
  return map[categoryId];
}

/**
 * Places API classica (maps.googleapis.com) — spesso già abilitata con la key mappa.
 * Funziona anche se Places API (New) / SearchNearby è bloccato.
 */
async function legacyTextSearch(
  query: string,
  bounds: Bounds[],
  maxRadiusKm: number,
  categoryId?: PlaceCategoryId | null
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };

  const primary = bounds[0];
  const cat = categoryId ? getPlaceCategory(categoryId) : null;
  const text = cat
    ? `${query} ${cat.textBoost ?? cat.label}`.trim()
    : query;

  const params = new URLSearchParams({
    query: primary.label ? `${text} ${primary.label}` : text,
    location: `${primary.lat},${primary.lng}`,
    radius: String(Math.min(maxRadiusKm * 1000, 40_000)),
    language: 'it',
    key: API_KEY,
  });

  const legacyType = legacyTypeForCategory(categoryId);
  if (legacyType) params.set('type', legacyType);

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      { cache: 'no-store', signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return { ok: false, results: [], status: 'HTTP_ERROR' };

    const data = (await res.json()) as {
      results?: {
        place_id: string;
        name: string;
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
        types?: string[];
      }[];
      status?: string;
      error_message?: string;
    };

    const status = data.status ?? 'UNKNOWN_ERROR';
    if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
      return {
        ok: false,
        results: [],
        status,
        errorMessage:
          data.error_message ||
          'Places API (legacy) negata. Abilita Places API sulla key o togli restrizioni referrer per uso server.',
      };
    }
    if (status !== 'OK' && status !== 'ZERO_RESULTS') {
      return {
        ok: false,
        results: [],
        status,
        errorMessage: data.error_message,
      };
    }

    const centers = bounds.map((b) => ({ lat: b.lat, lng: b.lng }));
    const results = (data.results ?? [])
      .map((place) => {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        if (lat == null || lng == null) return null;
        const minDist = Math.min(...centers.map((c) => haversineKm(c, { lat, lng })));
        if (minDist > maxRadiusKm) return null;
        const t0 = place.types?.[0] ?? '';
        return {
          id: place.place_id,
          label: place.name,
          subtitle: place.formattedAddress ?? '',
          lat,
          lng,
          placeTypeLabel: labelForGoogleType(t0),
          primaryType: t0,
          types: place.types,
        } satisfies GooglePlaceResult;
      })
      .filter((p): p is GooglePlaceResult => p !== null)
      .slice(0, 14);

    return { ok: true, results, status };
  } catch {
    return { ok: false, results: [], status: 'NETWORK_ERROR' };
  }
}

/**
 * Browse area per categoria.
 * Prova Nearby (New) → Text Search (New) → Text Search legacy.
 * Se Nearby è bloccato dalla key, salta e usa solo Text.
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

  // 1) Nearby (New) — solo se non già bloccato
  if (!nearbyBlocked && !placesNewBlocked) {
    const result = await placesPost('places:searchNearby', {
      includedTypes,
      maxResultCount: Math.min(limit, 20),
      rankPreference: 'POPULARITY',
      languageCode: 'it',
      locationRestriction: locationCircle,
    });

    if (result.ok && result.places.length > 0) {
      const mapped = {
        ok: true as const,
        results: mapPlaces(result.places, bounds, maxRadiusKm, limit),
        status: result.status,
      };
      cacheSet(cacheKey, mapped);
      return mapped;
    }

    if (isBlockedError(result.status, result.errorMessage)) {
      nearbyBlocked = true;
      // se il messaggio cita places.googleapis.com in generale, New intera
      if ((result.errorMessage || '').includes('places.googleapis.com')) {
        // Nearby specific — SearchText potrebbe ancora funzionare
      }
    }
  }

  // 2) Text Search (New) con query di categoria + destinazione
  if (!placesNewBlocked) {
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
      locationBias: locationCircle,
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
      placesNewBlocked = true;
      nearbyBlocked = true;
    }
  }

  // 3) Legacy Text Search (Places API classica)
  const legacyQuery = cat
    ? cat.textBoost ?? cat.label
    : 'attrazioni';
  const legacy = await legacyTextSearch(legacyQuery, bounds, maxRadiusKm, categoryId);
  if (legacy.ok && legacy.results.length > 0) {
    cacheSet(cacheKey, legacy);
    return legacy;
  }

  return {
    ok: false,
    results: [],
    status: legacy.status || 'BLOCKED',
    errorMessage:
      legacy.errorMessage ||
      'Places bloccato. In Google Cloud abilita «Places API (New)» e «Places API» sulla key, e per il server usa Application restriction None (non solo HTTP referrer).',
  };
}

/**
 * Ricerca testuale per categoria.
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
  const locationBias = {
    circle: {
      center: { latitude: primary.lat, longitude: primary.lng },
      radius: radiusM,
    },
  };

  // 1) Places New Text Search
  if (!placesNewBlocked) {
    const body: Record<string, unknown> = {
      textQuery: q,
      languageCode: 'it',
      maxResultCount: 14,
      locationBias,
    };
    if (cat?.textIncludedType) body.includedType = cat.textIncludedType;

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
      placesNewBlocked = true;
      nearbyBlocked = true;
    } else if (cat && (!result.ok || result.places.length === 0)) {
      // ritenta senza includedType
      const retry = await placesPost('places:searchText', {
        textQuery: `${q} ${cat.textBoost ?? cat.label}`,
        languageCode: 'it',
        maxResultCount: 14,
        locationBias,
      });
      if (retry.ok && retry.places.length > 0) {
        const mapped = {
          ok: true as const,
          results: mapPlaces(retry.places, bounds, maxRadiusKm, 14),
          status: retry.status,
        };
        cacheSet(cacheKey, mapped);
        return mapped;
      }
      if (isBlockedError(retry.status, retry.errorMessage)) {
        placesNewBlocked = true;
        nearbyBlocked = true;
      }
    }
  }

  // 2) Legacy
  const legacy = await legacyTextSearch(q, bounds, maxRadiusKm, categoryId);
  if (legacy.ok && legacy.results.length > 0) {
    cacheSet(cacheKey, legacy);
  }
  return legacy;
}

export function hasGooglePlacesKey(): boolean {
  return Boolean(API_KEY);
}
