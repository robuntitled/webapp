import 'server-only';

import type { ActivitySearchResult } from '@/lib/activities/types';
import {
  ACTIVITIES_PAGE_SIZE,
  searchViatorActivities,
} from '@/lib/viator/search';
import { isViatorConfigured } from '@/lib/viator/config';

function sortOffers<T extends { rating?: number | null; priceFrom?: number | null }>(
  offers: T[]
): T[] {
  return [...offers].sort((a, b) => {
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    const pa = a.priceFrom ?? Number.POSITIVE_INFINITY;
    const pb = b.priceFrom ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });
}

export async function searchAffiliateActivities(params: {
  city: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  start?: number;
}): Promise<ActivitySearchResult> {
  const city = params.city.trim();
  const query = params.query?.trim() || undefined;
  const startDate = params.startDate?.trim() || undefined;
  const endDate = params.endDate?.trim() || undefined;
  const start = Math.max(1, params.start ?? 1);
  const warnings: string[] = [];

  if (!isViatorConfigured()) {
    return {
      results: [],
      destinationName: null,
      providers: { viator: 'skipped' },
      warnings: [
        'Configura VIATOR_API_KEY per mostrare attività prenotabili.',
      ],
      nextStart: null,
      hasMore: false,
      totalCount: null,
    };
  }

  try {
    const page = await searchViatorActivities({
      city,
      query,
      startDate,
      endDate,
      start,
      limit: ACTIVITIES_PAGE_SIZE,
    });
    const results = sortOffers(page.results);
    if (!results.length && start === 1) {
      warnings.push('Nessuna attività prenotabile trovata per questa destinazione');
    }
    return {
      results,
      destinationName: page.destinationName,
      providers: { viator: 'ok' },
      warnings,
      nextStart: page.nextStart,
      hasMore: page.hasMore,
      totalCount: page.totalCount,
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'errore sconosciuto';
    console.error('[activities/viator]', reason);
    return {
      results: [],
      destinationName: null,
      providers: { viator: 'error' },
      warnings: [`Viator non disponibile: ${reason}`],
      nextStart: null,
      hasMore: false,
      totalCount: null,
    };
  }
}
