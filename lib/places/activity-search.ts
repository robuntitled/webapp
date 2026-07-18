import 'server-only';

import {
  ACTIVITY_CATEGORY_SEARCH,
  buildCategoryQuery,
  isActivityPlaceCategory,
  matchesActivityCategory,
  type ActivityPlaceCategory,
} from '@/lib/places/activity-categories';
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
  category?: ActivityPlaceCategory | null;
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

function softFilterByCategory(
  places: ActivityPlaceResult[],
  category: ActivityPlaceCategory | null
): ActivityPlaceResult[] {
  if (!category) return places;
  const matched = places.filter((p) =>
    matchesActivityCategory(category, {
      label: p.label,
      subtitle: p.subtitle,
      placeTypeLabel: p.placeTypeLabel,
    })
  );
  // Soft: se il filtro svuota, tieni i risultati grezzi (meglio qualcosa che nulla)
  return matched.length > 0 ? matched : places;
}

async function searchWithNominatim(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm: number,
  category: ActivityPlaceCategory | null
): Promise<ActivityPlaceResult[]> {
  const primary = bounds[0];
  const q = category ? buildCategoryQuery(query, category) : query;
  const contextual = primary.label ? `${q} ${primary.label}` : q;

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
  const base = inBounds.length > 0 ? inBounds : mapped;
  return softFilterByCategory(base, category).slice(0, 12);
}

/**
 * Ricerca attività settorializzata:
 * Overpass (tag OSM per categoria) → Nominatim → Google (se disponibile).
 */
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
  if (bounds.length === 0) {
    return {
      results: [],
      source: 'none',
      warning:
        'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.',
    };
  }

  const category: ActivityPlaceCategory | null = isActivityPlaceCategory(categoryInput)
    ? categoryInput
    : null;

  // 1) Overpass settorializzato (priorità: funziona senza Google e rispetta le tab)
  try {
    const overpassResults = await searchOverpassNearby(q, bounds, 12, category);
    if (overpassResults.length > 0) {
      return {
        results: overpassResults,
        source: 'overpass',
        category,
      };
    }
  } catch {
    // continue
  }

  // 2) Nominatim con boost categoria
  try {
    const nominatimResults = await searchWithNominatim(q, bounds, maxRadiusKm, category);
    if (nominatimResults.length > 0) {
      return { results: nominatimResults, source: 'nominatim', category };
    }
  } catch {
    // continue
  }

  // 3) Google (opzionale) con type se c'è categoria
  const googleQuery = category ? buildCategoryQuery(q, category) : q;
  const googleType = category ? ACTIVITY_CATEGORY_SEARCH[category].googleType : undefined;
  const google = await searchGooglePlacesInBounds(
    googleQuery,
    bounds.map((b) => ({ ...b, radiusKm: b.radiusKm })),
    maxRadiusKm,
    googleType
  );

  if (google.ok && google.results.length > 0) {
    const filtered = softFilterByCategory(google.results, category);
    if (filtered.length > 0) {
      return { results: filtered, source: 'google', category };
    }
  }

  const hints: Record<ActivityPlaceCategory, string> = {
    attraction: 'Prova «museo», «duomo», «castello» o un nome di monumento.',
    activity: 'Prova «parco», «piscina», «sport» o un nome di luogo.',
    meal: 'Prova «trattoria», «pizzeria», «café» o un nome di locale.',
  };

  return {
    results: [],
    source: 'none',
    category,
    warning: category
      ? `Nessun risultato in «${category === 'meal' ? 'Ristoranti' : category === 'activity' ? 'Attività' : 'Attrazioni'}». ${hints[category]}`
      : 'Nessun risultato vicino alle destinazioni. Prova un nome più specifico.',
  };
}
