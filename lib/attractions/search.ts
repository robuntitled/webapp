import 'server-only';

import type { AttractionHit, AttractionSearchResult } from '@/lib/attractions/types';
import { searchViatorAttractions } from '@/lib/viator/attractions';
import { isViatorConfigured } from '@/lib/viator/config';

export type AttractionServerFilters = {
  /** Solo attrazioni con almeno un tour collegato */
  withTours?: boolean;
  /** Solo ingresso gratuito */
  freeOnly?: boolean;
  /** Rating minimo (0–5) */
  minRating?: number;
};

function applyFilters(
  results: AttractionHit[],
  filters: AttractionServerFilters
): AttractionHit[] {
  let list = results;
  if (filters.withTours) {
    list = list.filter((r) => r.productCount > 0);
  }
  if (filters.freeOnly) {
    list = list.filter((r) => r.freeAttraction);
  }
  if (filters.minRating != null && filters.minRating > 0) {
    list = list.filter((r) => (r.rating ?? 0) >= filters.minRating!);
  }
  return list;
}

function sortAttractions(
  results: AttractionHit[],
  sort: 'rating' | 'tours' | 'name' | 'default'
): AttractionHit[] {
  const list = [...results];
  if (sort === 'name') {
    return list.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }
  if (sort === 'tours') {
    return list.sort((a, b) => b.productCount - a.productCount);
  }
  // rating + default
  return list.sort((a, b) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    return b.productCount - a.productCount;
  });
}

export async function searchAttractions(params: {
  city: string;
  query?: string;
  withTours?: boolean;
  freeOnly?: boolean;
  minRating?: number;
  sort?: 'rating' | 'tours' | 'name' | 'default';
}): Promise<AttractionSearchResult> {
  if (!isViatorConfigured()) {
    return {
      results: [],
      destinationName: null,
      provider: 'skipped',
      warnings: [
        'Configura VIATOR_API_KEY per mostrare attrazioni (catalogo Viator). GetYourGuide non espone un catalogo attrazioni separato.',
      ],
    };
  }

  try {
    const { results, destinationName } = await searchViatorAttractions({
      city: params.city,
      query: params.query,
      limit: 50,
    });

    const filtered = applyFilters(results, {
      withTours: params.withTours,
      freeOnly: params.freeOnly,
      minRating: params.minRating,
    });

    return {
      results: sortAttractions(filtered, params.sort ?? 'rating').slice(0, 48),
      destinationName,
      provider: 'ok',
      warnings: filtered.length
        ? []
        : ['Nessuna attrazione trovata con i filtri selezionati'],
    };
  } catch {
    return {
      results: [],
      destinationName: null,
      provider: 'error',
      warnings: ['Viator non disponibile al momento'],
    };
  }
}
