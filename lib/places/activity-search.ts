import 'server-only';

import { haversineKm } from '@/lib/maps/distance';
import { searchGooglePlacesInBounds, type GooglePlaceResult } from '@/lib/places/google-text-search';
import { searchPlaces } from '@/lib/places/nominatim';

export type ActivityPlaceResult = GooglePlaceResult;

export type ActivitySearchBounds = {
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
};

export type ActivitySearchResponse = {
  results: ActivityPlaceResult[];
  source: 'google' | 'nominatim' | 'none';
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

function buildContextQuery(query: string, bounds: ActivitySearchBounds[]): string {
  const labels = bounds
    .map((b) => b.label?.trim())
    .filter((label): label is string => Boolean(label));
  if (labels.length === 0) return query.trim();
  const context = labels.slice(0, 2).join(' ');
  return `${query.trim()} ${context}`.trim();
}

async function searchWithNominatim(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm: number
): Promise<ActivityPlaceResult[]> {
  const contextualQuery = buildContextQuery(query, bounds);
  const places = await searchPlaces(contextualQuery, 20);
  const mapped: ActivityPlaceResult[] = places.map((place) => ({
    id: place.id,
    label: place.label,
    subtitle: place.subtitle,
    lat: place.lat,
    lng: place.lng,
    placeTypeLabel: place.placeTypeLabel,
  }));
  return filterByBounds(mapped, bounds, maxRadiusKm).slice(0, 12);
}

export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 120
): Promise<ActivitySearchResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return { results: [], source: 'none' };
  }
  if (bounds.length === 0) {
    return {
      results: [],
      source: 'none',
      warning: 'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.',
    };
  }

  const google = await searchGooglePlacesInBounds(q, bounds, maxRadiusKm);
  if (google.ok && google.results.length > 0) {
    return { results: google.results, source: 'google' };
  }

  try {
    const nominatimResults = await searchWithNominatim(q, bounds, maxRadiusKm);
    if (nominatimResults.length > 0) {
      return {
        results: nominatimResults,
        source: 'nominatim',
        warning:
          google.status === 'REQUEST_DENIED'
            ? 'Ricerca tramite OpenStreetMap (Places API non abilitata sulla chiave Google).'
            : undefined,
      };
    }
  } catch {
    // fall through to empty response
  }

  if (google.status === 'REQUEST_DENIED') {
    return {
      results: [],
      source: 'none',
      warning:
        'Google Places non è abilitato sul progetto. Abilita "Places API" in Google Cloud Console oppure prova un altro termine di ricerca.',
    };
  }

  return { results: [], source: 'none' };
}