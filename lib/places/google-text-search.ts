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

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryTypeDisplayName,places.primaryType';

/** Tipi Table A Places API (New) — solo valori validi (OR). */
const NEARBY_TYPES = [
  'tourist_attraction',
  'museum',
  'art_gallery',
  'park',
  'church',
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'amusement_park',
  'zoo',
  'aquarium',
  'stadium',
  'spa',
  'night_club',
  'movie_theater',
  'shopping_mall',
  'hindu_temple',
  'mosque',
  'synagogue',
];

const TYPE_LABELS_IT: Record<string, string> = {
  tourist_attraction: 'Attrazione',
  museum: 'Museo',
  art_gallery: 'Galleria',
  park: 'Parco',
  historical_landmark: 'Storico',
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
  market: 'Mercato',
  viewpoint: 'Panorama',
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
  primaryTypeDisplayName?: { text?: string };
};

function placeTypeLabel(place: PlacesApiPlace): string {
  if (place.primaryTypeDisplayName?.text) return place.primaryTypeDisplayName.text;
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

  // Più vicini prima
  out.sort((a, b) => {
    const da = Math.min(...centers.map((c) => haversineKm(c, a)));
    const db = Math.min(...centers.map((c) => haversineKm(c, b)));
    return da - db;
  });

  return out;
}

async function placesPost(
  path: 'places:searchText' | 'places:searchNearby',
  body: Record<string, unknown>
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
      signal: AbortSignal.timeout(8_000),
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
 * Luoghi popolari nell’area (senza testo) — Places Nearby Search (New).
 */
export async function searchGooglePlacesNearby(
  bounds: Bounds[],
  maxRadiusKm = 25,
  limit = 16
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };
  if (bounds.length === 0) return { ok: false, results: [], status: 'INVALID_REQUEST' };

  const primary = bounds[0];
  const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 1000), 50_000);

  const locationRestriction = {
    circle: {
      center: { latitude: primary.lat, longitude: primary.lng },
      radius: radiusM,
    },
  };

  let result = await placesPost('places:searchNearby', {
    includedTypes: NEARBY_TYPES,
    maxResultCount: Math.min(limit, 20),
    rankPreference: 'POPULARITY',
    languageCode: 'it',
    locationRestriction,
  });

  // Se fallisce (tipo non supportato / API), ritenta con set minimale
  if (!result.ok) {
    result = await placesPost('places:searchNearby', {
      includedTypes: ['tourist_attraction', 'restaurant', 'museum', 'park', 'cafe'],
      maxResultCount: Math.min(limit, 20),
      rankPreference: 'POPULARITY',
      languageCode: 'it',
      locationRestriction,
    });
  }

  // Ultimo fallback: text search “cose da fare” nell’area
  if (!result.ok || result.places.length === 0) {
    const textFallback = await placesPost('places:searchText', {
      textQuery: primary.label
        ? `attrazioni ristoranti ${primary.label}`
        : 'attrazioni ristoranti',
      languageCode: 'it',
      maxResultCount: Math.min(limit, 20),
      locationBias: locationRestriction,
    });
    if (textFallback.ok && textFallback.places.length > 0) {
      return {
        ok: true,
        results: mapPlaces(textFallback.places, bounds, maxRadiusKm, limit),
        status: textFallback.status,
      };
    }
    return {
      ok: false,
      results: [],
      status: result.status,
      errorMessage: result.errorMessage,
    };
  }

  return {
    ok: true,
    results: mapPlaces(result.places, bounds, maxRadiusKm, limit),
    status: result.status,
  };
}

/**
 * Ricerca testuale libera — Places Text Search (New), bias sull’area mappa.
 */
export async function searchGooglePlacesInBounds(
  query: string,
  bounds: Bounds[],
  maxRadiusKm = 80,
  _type?: string
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };
  if (query.trim().length < 2 || bounds.length === 0) {
    return { ok: false, results: [], status: 'INVALID_REQUEST' };
  }

  const primary = bounds[0];
  const radiusM = Math.min(Math.max((primary.radiusKm ?? maxRadiusKm) * 1000, 2000), 50_000);

  // Preferisci query + destinazione per risultati più rilevanti
  const textQuery = primary.label
    ? `${query.trim()} ${primary.label}`
    : query.trim();

  const result = await placesPost('places:searchText', {
    textQuery,
    languageCode: 'it',
    maxResultCount: 16,
    locationBias: {
      circle: {
        center: { latitude: primary.lat, longitude: primary.lng },
        radius: radiusM,
      },
    },
  });

  if (!result.ok) {
    // Fallback legacy Text Search se Places API (New) non è abilitata
    return legacyTextSearch(query.trim(), bounds, maxRadiusKm);
  }

  const mapped = mapPlaces(result.places, bounds, maxRadiusKm, 16);
  if (mapped.length > 0) {
    return { ok: true, results: mapped, status: result.status };
  }

  // Zero results con New → prova legacy una volta
  return legacyTextSearch(query.trim(), bounds, maxRadiusKm);
}

/** Legacy Places Text Search (se solo “Places API” classica è attiva). */
async function legacyTextSearch(
  query: string,
  bounds: Bounds[],
  maxRadiusKm: number
): Promise<GooglePlacesSearchResult> {
  if (!API_KEY) return { ok: false, results: [], status: 'MISSING_API_KEY' };

  const primary = bounds[0];
  const location = `${primary.lat},${primary.lng}`;
  const radiusM = Math.min(maxRadiusKm * 1000, 50_000);

  const params = new URLSearchParams({
    query: primary.label ? `${query} ${primary.label}` : query,
    location,
    radius: String(radiusM),
    language: 'it',
    key: API_KEY,
  });

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8_000) }
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
      .slice(0, 16);

    return { ok: true, results, status };
  } catch {
    return { ok: false, results: [], status: 'NETWORK_ERROR' };
  }
}

export function hasGooglePlacesKey(): boolean {
  return Boolean(API_KEY);
}
