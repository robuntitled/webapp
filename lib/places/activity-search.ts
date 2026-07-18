import 'server-only';

import {
  ACTIVITY_CATEGORY_SEARCH,
  buildCategoryQuery,
  isActivityPlaceCategory,
  isGenericCategoryQuery,
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

function filterByCategory(
  places: ActivityPlaceResult[],
  category: ActivityPlaceCategory | null,
  mode: 'soft' | 'hard'
): ActivityPlaceResult[] {
  if (!category) return places;
  const matched = places.filter((p) =>
    matchesActivityCategory(category, {
      label: p.label,
      subtitle: p.subtitle,
      placeTypeLabel: p.placeTypeLabel,
    })
  );
  if (mode === 'hard') return matched;
  // Soft: se il filtro svuota, tieni i grezzi solo se la query non era settoriale stretta
  return matched.length > 0 ? matched : places;
}

function nameMatchesQuery(label: string, query: string): boolean {
  return label.toLowerCase().includes(query.trim().toLowerCase());
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
  // Hard filter se abbiamo categoria: meglio pochi giusti che città/admin spurii
  return filterByCategory(base, category, category ? 'hard' : 'soft').slice(0, 12);
}

/**
 * Ricerca attività settorializzata:
 * Overpass (tag OSM per tab) → Nominatim → Google (se disponibile).
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

  const generic = category ? isGenericCategoryQuery(q, category) : false;

  // 1) Overpass settorializzato (tag OSM della tab)
  try {
    const overpassResults = await searchOverpassNearby(q, bounds, 12, category);
    if (overpassResults.length > 0) {
      // Con query specifica: accetta solo se almeno un nome matcha, o se era browse generico
      const anyNameHit = overpassResults.some((r) => nameMatchesQuery(r.label, q));
      if (generic || anyNameHit || !category) {
        return {
          results: overpassResults,
          source: 'overpass',
          category,
        };
      }
      // Altrimenti (raro): non usare dump non correlati
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
    const filtered = filterByCategory(google.results, category, category ? 'hard' : 'soft');
    if (filtered.length > 0) {
      return { results: filtered, source: 'google', category };
    }
    // Se hard svuota, soft come ultima spiaggia
    if (category) {
      const soft = filterByCategory(google.results, category, 'soft');
      if (soft.length > 0) {
        return { results: soft, source: 'google', category };
      }
    }
  }

  const hints: Record<ActivityPlaceCategory, string> = {
    attraction: 'Prova «museo», «duomo», «castello» o il nome di un monumento.',
    activity: 'Prova «piscina», «palestra», «kayak», «spa» o un nome di esperienza.',
    meal: 'Prova «pizzeria», «trattoria», «café» o il nome del locale.',
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
