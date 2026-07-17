import 'server-only';

import { haversineKm } from '@/lib/maps/distance';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export type GooglePlaceResult = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeTypeLabel: string;
};

type Bounds = { lat: number; lng: number; radiusKm?: number };

export type GooglePlacesSearchResult = {
  ok: boolean;
  results: GooglePlaceResult[];
  status: string;
  errorMessage?: string;
};

export type GoogleTextSearchOptions = {
  maxRadiusKm?: number;
  /** Google Places type filter, e.g. restaurant | tourist_attraction */
  type?: string;
  /** Optional post-filter using place.types */
  typeAllowlist?: string[];
  typeBlocklist?: string[];
};

export async function searchGooglePlacesInBounds(
  query: string,
  bounds: Bounds[],
  maxRadiusKmOrOptions: number | GoogleTextSearchOptions = 120
): Promise<GooglePlacesSearchResult> {
  const options: GoogleTextSearchOptions =
    typeof maxRadiusKmOrOptions === 'number'
      ? { maxRadiusKm: maxRadiusKmOrOptions }
      : maxRadiusKmOrOptions;
  const maxRadiusKm = options.maxRadiusKm ?? 120;

  if (!API_KEY) {
    return { ok: false, results: [], status: 'MISSING_API_KEY' };
  }
  if (query.trim().length < 2 || bounds.length === 0) {
    return { ok: false, results: [], status: 'INVALID_REQUEST' };
  }

  const primary = bounds[0];
  const location = `${primary.lat},${primary.lng}`;
  const radiusM = Math.min(maxRadiusKm * 1000, 50000);

  const params = new URLSearchParams({
    query: query.trim(),
    location,
    radius: String(radiusM),
    language: 'it',
    key: API_KEY,
  });
  if (options.type) {
    params.set('type', options.type);
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    return { ok: false, results: [], status: 'HTTP_ERROR' };
  }

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

  const allowedCenters = bounds.map((b) => ({ lat: b.lat, lng: b.lng }));
  const allow = options.typeAllowlist?.map((t) => t.toLowerCase());
  const block = options.typeBlocklist?.map((t) => t.toLowerCase());

  const results = (data.results ?? [])
    .map((place) => {
      const lat = place.geometry?.location?.lat;
      const lng = place.geometry?.location?.lng;
      if (lat == null || lng == null) return null;
      const minDist = Math.min(
        ...allowedCenters.map((c) => haversineKm(c, { lat, lng }))
      );
      if (minDist > maxRadiusKm) return null;

      const types = (place.types ?? []).map((t) => t.toLowerCase());
      if (block?.some((b) => types.includes(b))) return null;
      if (allow && allow.length > 0 && !allow.some((a) => types.includes(a))) {
        return null;
      }

      return {
        id: place.place_id,
        label: place.name,
        subtitle: place.formatted_address ?? '',
        lat,
        lng,
        placeTypeLabel: place.types?.[0]?.replace(/_/g, ' ') ?? 'Luogo',
      } satisfies GooglePlaceResult;
    })
    .filter((p): p is GooglePlaceResult => p !== null)
    .slice(0, 12);

  return { ok: true, results, status };
}