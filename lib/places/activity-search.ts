import 'server-only';

import {
  hasGooglePlacesKey,
  searchGooglePlacesInBounds,
  searchGooglePlacesNearby,
  type GooglePlaceResult,
} from '@/lib/places/google-text-search';
import {
  getPlaceCategory,
  isPlaceCategoryId,
  type PlaceCategoryId,
} from '@/lib/places/place-categories';

export type ActivityPlaceResult = GooglePlaceResult;

export type ActivitySearchBounds = {
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
};

export type ActivitySearchResponse = {
  results: ActivityPlaceResult[];
  source: 'google' | 'none';
  warning?: string;
  category?: PlaceCategoryId | null;
};

/**
 * Google Places con filtro categoria (tipi Table A).
 * Query vuota → Nearby della tab; con testo → Text Search + includedType.
 */
export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 60,
  categoryInput?: string | null
): Promise<ActivitySearchResponse> {
  const q = query.trim();
  const category: PlaceCategoryId | null = isPlaceCategoryId(categoryInput)
    ? categoryInput
    : 'attraction';

  if (bounds.length === 0) {
    return {
      results: [],
      source: 'none',
      category,
      warning:
        'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.',
    };
  }

  if (!hasGooglePlacesKey()) {
    return {
      results: [],
      source: 'none',
      category,
      warning:
        'Manca la chiave Google Maps su Vercel (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY o GOOGLE_MAPS_API_KEY).',
    };
  }

  const catLabel = getPlaceCategory(category).label;

  try {
    if (q.length < 2) {
      const nearby = await searchGooglePlacesNearby(bounds, 30, 14, category);
      if (nearby.ok && nearby.results.length > 0) {
        return { results: nearby.results, source: 'google', category };
      }
      return {
        results: [],
        source: 'none',
        category,
        warning:
          nearby.errorMessage ||
          `Nessun risultato in «${catLabel}» nell’area. Prova un’altra categoria o cerca un nome.`,
      };
    }

    const text = await searchGooglePlacesInBounds(q, bounds, maxRadiusKm, category);
    if (text.ok && text.results.length > 0) {
      return { results: text.results, source: 'google', category };
    }
    return {
      results: [],
      source: 'none',
      category,
      warning:
        text.errorMessage ||
        `Nessun risultato in «${catLabel}» per «${q}». Prova un altro termine o categoria.`,
    };
  } catch {
    return {
      results: [],
      source: 'none',
      category,
      warning: 'Ricerca Google non disponibile al momento. Riprova.',
    };
  }
}
