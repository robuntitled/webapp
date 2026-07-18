import 'server-only';

import { haversineKm } from '@/lib/maps/distance';

/** Server-side preferibile; fallback alla key pubblica usata dalla mappa. */
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
};

type Bounds = { lat: number; lng: number; radiusKm?: number; label?: string };

export type GooglePlacesSearchResult = {
  ok: boolean;
  results: GooglePlaceResult[];
  status: string;
  errorMessage?: string;
};

/** Field mask minimal: meno payload = un po’ più veloce. */
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types';

/** Pochi tipi = Nearby più leggero (OR). */
const NEARBY_TYPES = [
  'tourist_attraction',
  'museum',
  'restaurant',
  'cafe',
  'park',
];

const TYPE_LABELS_IT: Record<string, string> = {
  tourist_attraction: 'Attrazione',
  museum: 'Museo',
  art_gallery: 'Galleria',
  park: 'Parco',
  church: 'Chiesa',
  restaurant: 'Ristorante',
  cafe: 'Caffè',
  bar: 'Bar',
  bakery: 'Panetteria',
  amusement_park: 'Divertimenti',
  zoo: 'Zoo',
  aquarium: 'Acquario',
  stadium: 'Stadio',
  spa: 'Spa',
  night_club: 'Nightlife',
  movie_theater: 'Cinema',
  shopping_mall: 'Shopping',
  lodging: 'Alloggio',
  hotel: 'Hotel',
  point_of_interest: 'Luogo',
  establishment: 'Luogo',
};

type PlacesApiPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
};

// Cache in-memory (serverless warm instances) — evita doppie chiamate Google
type CacheEntry = { at: number; result: GooglePlacesSearchResult };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 8 * 60_000; // 8 min
const CACHE_MAX = 80;

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
  const primary = place.primaryType;
  if (primary && TYPE_LABELS_IT[primary]) return TYPE_LABELS_IT[primary];
  for (const t of place.types ?? []) {
    if (TYPE_LABELS_IT[t]) return TYPE_LABELS_IT[t];
  }
  const raw = primary || place.types?.[0];
  return raw ? raw.replace(/_/g, ' ') : 'Luogo';
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
 * Luoghi popolari nell’area — una sola chiamata Nearby (cache 8 min).
 */
export async function searchGooglePlacesNearby(
  bounds: Bounds[],
  maxRadiusKm = 25,
  limit = 14
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };
  if (bounds.length === 0) return { ok: false, results: [], status: 'INVALID_REQUEST' };

  const primary = bounds[0];
  const cacheKey = `nb:${primary.lat.toFixed(3)},${primary.lng.toFixed(3)}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 1500), 25_000);

  const result = await placesPost('places:searchNearby', {
    includedTypes: NEARBY_TYPES,
    maxResultCount: Math.min(limit, 20),
    rankPreference: 'POPULARITY',
    languageCode: 'it',
    locationRestriction: {
      circle: {
        center: { latitude: primary.lat, longitude: primary.lng },
        radius: radiusM,
      },
    },
  });

  // Se Nearby fallisce: una sola Text Search, niente catene lunghe
  if (!result.ok || result.places.length === 0) {
    const text = await placesPost('places:searchText', {
      textQuery: primary.label
        ? `cose da fare e ristoranti a ${primary.label}`
        : 'attrazioni e ristoranti',
      languageCode: 'it',
      maxResultCount: Math.min(limit, 20),
      locationBias: {
        circle: {
          center: { latitude: primary.lat, longitude: primary.lng },
          radius: radiusM,
        },
      },
    });
    if (text.ok && text.places.length > 0) {
      const mapped = {
        ok: true as const,
        results: mapPlaces(text.places, bounds, maxRadiusKm, limit),
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
    results: mapPlaces(result.places, bounds, maxRadiusKm, limit),
    status: result.status,
  };
  cacheSet(cacheKey, mapped);
  return mapped;
}

/**
 * Ricerca testuale — una sola Text Search (New). Cache breve per query ripetute.
 */
export async function searchGooglePlacesInBounds(
  query: string,
  bounds: Bounds[],
  maxRadiusKm = 60,
  _type?: string
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };
  if (query.trim().length < 2 || bounds.length === 0) {
    return { ok: false, results: [], status: 'INVALID_REQUEST' };
  }

  const primary = bounds[0];
  const q = query.trim().toLowerCase();
  const cacheKey = `tx:${primary.lat.toFixed(3)},${primary.lng.toFixed(3)}:${q}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 2000), 40_000);

  // Query semplice: destinazione come locationBias, non sempre in text (più veloce/rilevante)
  const result = await placesPost('places:searchText', {
    textQuery: query.trim(),
    languageCode: 'it',
    maxResultCount: 14,
    regionCode: 'IT',
    locationBias: {
      circle: {
        center: { latitude: primary.lat, longitude: primary.lng },
        radius: radiusM,
      },
    },
  });

  if (!result.ok) {
    return legacyTextSearch(query.trim(), bounds, maxRadiusKm);
  }

  const mapped = {
    ok: true as const,
    results: mapPlaces(result.places, bounds, maxRadiusKm, 14),
    status: result.status,
  };
  cacheSet(cacheKey, mapped);
  return mapped;
}

async function legacyTextSearch(
  query: string,
  bounds: Bounds[],
  maxRadiusKm: number
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };

  const primary = bounds[0];
  const params = new URLSearchParams({
    query: primary.label ? `${query} ${primary.label}` : query,
    location: `${primary.lat},${primary.lng}`,
    radius: String(Math.min(maxRadiusKm * 1000, 40_000)),
    language: 'it',
    key: API_KEY,
  });

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      { cache: 'no-store', signal: AbortSignal.timeout(4_000) }
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
          subtitle: place.formatted_address ?? '',
          lat,
          lng,
          placeTypeLabel: TYPE_LABELS_IT[t0] ?? (t0.replace(/_/g, ' ') || 'Luogo'),
        } satisfies GooglePlaceResult;
      })
      .filter((p): p is GooglePlaceResult => p !== null)
      .slice(0, 14);

    return { ok: true, results, status };
  } catch {
    return { ok: false, results: [], status: 'NETWORK_ERROR' };
  }
}

export function hasGooglePlacesKey(): boolean {
  return Boolean(API_KEY);
}
