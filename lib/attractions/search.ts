import 'server-only';

import type { AttractionHit, AttractionSearchResult } from '@/lib/attractions/types';
import {
  ATTRACTIONS_PAGE_SIZE,
  searchViatorAttractions,
} from '@/lib/viator/attractions';
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
  sort: 'rating' | 'default'
): AttractionHit[] {
  const list = [...results];
  if (sort === 'rating') {
    return list.sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (rb !== ra) return rb - ra;
      return b.productCount - a.productCount;
    });
  }
  return list.sort((a, b) => b.productCount - a.productCount);
}

export async function searchAttractions(params: {
  city: string;
  query?: string;
  withTours?: boolean;
  freeOnly?: boolean;
  minRating?: number;
  sort?: 'rating' | 'default';
  start?: number;
}): Promise<AttractionSearchResult> {
  if (!isViatorConfigured()) {
    return {
      results: [],
      destinationName: null,
      provider: 'skipped',
      warnings: [
        'Configura VIATOR_API_KEY per mostrare attrazioni (catalogo Viator).',
      ],
      nextStart: null,
      hasMore: false,
      totalCount: null,
    };
  }

  try {
    const page = await searchViatorAttractions({
      city: params.city,
      query: params.query,
      start: params.start ?? 1,
      limit: ATTRACTIONS_PAGE_SIZE,
    });

    const filtered = applyFilters(page.results, {
      withTours: params.withTours,
      freeOnly: params.freeOnly,
      minRating: params.minRating,
    });

    return {
      results: sortAttractions(filtered, params.sort ?? 'default'),
      destinationName: page.destinationName,
      provider: 'ok',
      warnings:
        filtered.length || (params.start ?? 1) > 1
          ? []
          : ['Nessuna attrazione trovata con i filtri selezionati'],
      nextStart: page.nextStart,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'errore sconosciuto';
    console.error('[attractions]', detail);
    return {
      results: [],
      destinationName: null,
      provider: 'error',
      warnings: [`Viator non disponibile: ${detail}`],
      nextStart: null,
      hasMore: false,
      totalCount: null,
    };
  }
}
