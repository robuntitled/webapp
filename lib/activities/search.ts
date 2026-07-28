import 'server-only';

import type { ActivityOffer, ActivitySearchResult } from '@/lib/activities/types';
import { searchGygActivities } from '@/lib/getyourguide/search';
import { isGygConfigured } from '@/lib/getyourguide/config';
import { searchViatorActivities } from '@/lib/viator/search';
import { isViatorConfigured } from '@/lib/viator/config';

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** Soft dedupe: stesso titolo normalizzato → tieni il più economico o con rating migliore */
function softDedupe(offers: ActivityOffer[]): ActivityOffer[] {
  const byKey = new Map<string, ActivityOffer>();
  for (const offer of offers) {
    const key = normalizeTitle(offer.title);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, offer);
      continue;
    }
    const prevScore =
      (prev.rating ?? 0) * 10 - (prev.priceFrom ?? 9999) / 100;
    const nextScore =
      (offer.rating ?? 0) * 10 - (offer.priceFrom ?? 9999) / 100;
    if (nextScore > prevScore) byKey.set(key, offer);
  }
  return [...byKey.values()];
}

function sortOffers(offers: ActivityOffer[]): ActivityOffer[] {
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
}): Promise<ActivitySearchResult> {
  const city = params.city.trim();
  const query = params.query?.trim() || undefined;
  const warnings: string[] = [];
  const providers: ActivitySearchResult['providers'] = {
    viator: isViatorConfigured() ? 'ok' : 'skipped',
    getyourguide: isGygConfigured() ? 'ok' : 'skipped',
  };

  if (providers.viator === 'skipped' && providers.getyourguide === 'skipped') {
    return {
      results: [],
      providers,
      warnings: [
        'Configura VIATOR_API_KEY e/o GETYOURGUIDE_ACCESS_TOKEN per mostrare attività prenotabili.',
      ],
    };
  }

  const [viatorSettled, gygSettled] = await Promise.allSettled([
    providers.viator === 'ok'
      ? searchViatorActivities({ city, query, limit: 24 })
      : Promise.resolve([] as ActivityOffer[]),
    providers.getyourguide === 'ok'
      ? searchGygActivities({ city, query, limit: 24 })
      : Promise.resolve([] as ActivityOffer[]),
  ]);

  const collected: ActivityOffer[] = [];

  if (providers.viator === 'ok') {
    if (viatorSettled.status === 'fulfilled') {
      collected.push(...viatorSettled.value);
    } else {
      providers.viator = 'error';
      warnings.push('Viator non disponibile al momento');
    }
  }

  if (providers.getyourguide === 'ok') {
    if (gygSettled.status === 'fulfilled') {
      collected.push(...gygSettled.value);
    } else {
      providers.getyourguide = 'error';
      warnings.push('GetYourGuide non disponibile al momento');
    }
  }

  const results = sortOffers(softDedupe(collected)).slice(0, 48);

  if (!results.length && !warnings.length) {
    warnings.push('Nessuna attività prenotabile trovata per questa destinazione');
  }

  return { results, providers, warnings };
}
