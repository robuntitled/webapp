import 'server-only';

import { haversineKm } from '@/lib/maps/distance';
import { searchGooglePlacesInBounds, type GooglePlaceResult } from '@/lib/places/google-text-search';
import { searchPlaces } from '@/lib/places/nominatim';
import { searchOverpassNearby } from '@/lib/places/overpass-search';

export type ActivityPlaceResult = GooglePlaceResult;

export type ActivitySearchBounds = {
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
};

export type ActivitySearchResponse = {
  results: ActivityPlaceResult[];
  source: 'google' | 'nominatim' | 'overpass' | 'none';
  warning?: string;
};

function filterByBounds(
  places: ActivityPlaceResult[],
  bounds: ActivitySearchBounds[],
  maxRadiusKm: number
): ActivityPlaceResult[] {
  if (bounds.length === 0) return places;
  const centers = bounds.map((b) => ({ lat: b.lat, lng: b.lng }));
  return places.filter((place) => {
    const minDist = Math.min(
      ...centers.map((c) => haversineKm(c, { lat: place.lat, lng: place.lng }))
    );
    return minDist <= maxRadiusKm;
  });
}

async function searchWithNominatim(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm: number
): Promise<ActivityPlaceResult[]> {
  const primary = bounds[0];
  const contextual = primary.label ? `${query} ${primary.label}` : query;

  const places = await searchPlaces(contextual, 20);
  const mapped: ActivityPlaceResult[] = places.map((place) => ({
    id: place.id,
    label: place.label,
    subtitle: place.subtitle,
    lat: place.lat,
    lng: place.lng,
    placeTypeLabel: place.placeTypeLabel,
  }));

  const inBounds = filterByBounds(mapped, bounds, maxRadiusKm);
  return (inBounds.length > 0 ? inBounds : mapped).slice(0, 16);
}

/**
 * Ricerca luoghi nell'area destinazione — senza filtri categoria.
 * Query vuota → POI interessanti nell'area mappa.
 * Query con testo → cerca tutto per nome.
 */
export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 120
): Promise<ActivitySearchResponse> {
  const q = query.trim();

  if (bounds.length === 0) {
    return {
      results: [],
      source: 'none',
      warning:
        'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.',
    };
  }

  // 1) Overpass: area mappa (default) o ricerca nome libera
  try {
    const overpassResults = await searchOverpassNearby(q, bounds, 16);
    if (overpassResults.length > 0) {
      return { results: overpassResults, source: 'overpass' };
    }
  } catch {
    // continue
  }

  // 2) Nominatim (solo con testo)
  if (q.length >= 2) {
    try {
      const nominatimResults = await searchWithNominatim(q, bounds, maxRadiusKm);
      if (nominatimResults.length > 0) {
        return { results: nominatimResults, source: 'nominatim' };
      }
    } catch {
      // continue
    }

    // 3) Google opzionale
    const google = await searchGooglePlacesInBounds(
      q,
      bounds.map((b) => ({ ...b, radiusKm: b.radiusKm })),
      maxRadiusKm
    );

    if (google.ok && google.results.length > 0) {
      return { results: google.results.slice(0, 16), source: 'google' };
    }
  }

  return {
    results: [],
    source: 'none',
    warning: q.length >= 2
      ? 'Nessun risultato vicino alle destinazioni. Prova un nome diverso.'
      : 'Nessun luogo trovato nell’area della mappa. Prova a cercare un nome.',
  };
}
