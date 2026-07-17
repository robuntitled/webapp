import 'server-only';

import { haversineKm } from '@/lib/maps/distance';
import {
  ACTIVITY_CATEGORY_SEARCH,
  buildCategoryQuery,
  matchesActivityCategory,
  type ActivityPlaceCategory,
} from '@/lib/places/activity-categories';
import { searchPlaces } from '@/lib/places/nominatim';
import { searchGooglePlacesInBounds, type GooglePlaceResult } from '@/lib/places/google-text-search';

export type ActivityPlaceResult = GooglePlaceResult;

export type ActivitySearchBounds = {
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
};

export type ActivitySearchResponse = {
  results: ActivityPlaceResult[];
  source: 'nominatim' | 'google' | 'none';
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
  return `${query.trim()} ${labels.slice(0, 2).join(' ')}`.trim();
}

async function searchWithNominatim(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm: number,
  category: ActivityPlaceCategory | null
): Promise<ActivityPlaceResult[]> {
  const contextualQuery = buildContextQuery(query, bounds);
  const places = await searchPlaces(contextualQuery, {
    limit: 20,
    category,
  });
  const mapped: ActivityPlaceResult[] = places.map((place) => ({
    id: place.id,
    label: place.label,
    subtitle: place.subtitle,
    lat: place.lat,
    lng: place.lng,
    placeTypeLabel: place.placeTypeLabel,
  }));
  const filtered = filterByBounds(mapped, bounds, maxRadiusKm);
  return (filtered.length > 0 ? filtered : mapped).slice(0, 12);
}

export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 120,
  categoryInput?: string | null
): Promise<ActivitySearchResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return { results: [], source: 'none' };
  }

  // Narrow explicitly — type guards on optional params don't always refine for tsc on Vercel
  let category: ActivityPlaceCategory | null = null;
  if (categoryInput === 'attraction' || categoryInput === 'activity' || categoryInput === 'meal') {
    category = categoryInput;
  }

  try {
    const nominatimResults = await searchWithNominatim(
      q,
      bounds.length > 0 ? bounds : [{ lat: 0, lng: 0, label: '' }],
      bounds.length > 0 ? maxRadiusKm : 50000,
      category
    );
    if (nominatimResults.length > 0) {
      return { results: nominatimResults, source: 'nominatim' };
    }
  } catch {
    // try Google below
  }

  if (bounds.length === 0) {
    return { results: [], source: 'none' };
  }

  const googleQuery = category ? buildCategoryQuery(q, category) : q;
  const googleType = category ? ACTIVITY_CATEGORY_SEARCH[category].googleType : undefined;

  const google = await searchGooglePlacesInBounds(googleQuery, bounds, {
    maxRadiusKm,
    type: googleType,
  });

  if (google.ok && google.results.length > 0) {
    const filtered = category
      ? google.results.filter((place) =>
          matchesActivityCategory(category, {
            label: place.label,
            subtitle: place.subtitle,
            placeTypeLabel: place.placeTypeLabel,
          })
        )
      : google.results;
    if (filtered.length > 0) {
      return { results: filtered, source: 'google' };
    }
  }

  return { results: [], source: 'none' };
}