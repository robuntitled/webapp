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
import {
  buildPlacesCacheKey,
  getPlacesFromDbCache,
  setPlacesDbCache,
} from '@/lib/places/places-db-cache';
import { logApiMetric } from '@/lib/api/metrics';

export type ActivityPlaceResult = GooglePlaceResult;

export type ActivitySearchBounds = {
  lat: number;
  lng: number;
  radiusKm?: number;
  label?: string;
};

export type ActivitySearchResponse = {
  results: ActivityPlaceResult[];
  source: 'google' | 'cache' | 'none';
  warning?: string;
  category?: PlaceCategoryId | null;
};

/** Dedup richieste identiche in volo (stessa istanza). */
const inflight = new Map<string, Promise<ActivitySearchResponse>>();

async function fetchFromGoogle(options: {
  q: string;
  bounds: ActivitySearchBounds[];
  maxRadiusKm: number;
  category: PlaceCategoryId;
  cacheKey: string;
  primary: ActivitySearchBounds;
}): Promise<ActivitySearchResponse> {
  const { q, bounds, maxRadiusKm, category, cacheKey, primary } = options;
  const catLabel = getPlaceCategory(category).label;
  const started = Date.now();

  try {
    let results: GooglePlaceResult[] = [];
    let warning: string | undefined;

    if (q.length < 3) {
      const nearby = await searchGooglePlacesNearby(bounds, 30, 14, category);
      if (nearby.ok && nearby.results.length > 0) {
        results = nearby.results;
      } else {
        warning =
          nearby.errorMessage ||
          `Nessun risultato in «${catLabel}» nell’area. Prova un’altra categoria o cerca un nome.`;
      }
    } else {
      const text = await searchGooglePlacesInBounds(q, bounds, maxRadiusKm, category);
      if (text.ok && text.results.length > 0) {
        results = text.results;
      } else {
        warning =
          text.errorMessage ||
          `Nessun risultato in «${catLabel}» per «${q}». Prova un altro termine o categoria.`;
      }
    }

    if (results.length > 0) {
      void setPlacesDbCache({
        cacheKey,
        lat: primary.lat,
        lng: primary.lng,
        category,
        query: q,
        results,
        language: 'it',
      });
      logApiMetric({
        service: 'places',
        op: 'activity-search',
        source: 'network',
        ms: Date.now() - started,
        extra: { category, qLen: q.length },
      });
      return { results, source: 'google', category };
    }

    logApiMetric({
      service: 'places',
      op: 'activity-search',
      source: 'none',
      ms: Date.now() - started,
    });
    return { results: [], source: 'none', category, warning };
  } catch {
    return {
      results: [],
      source: 'none',
      category,
      warning: 'Ricerca Google non disponibile al momento. Riprova.',
    };
  }
}

/**
 * Google Places con filtro categoria.
 * Ordine: cache DB condivisa → Google → salva in DB.
 * Query vuota → browse categoria; testo (≥3) → Text Search.
 * Stale cache: serve subito + refresh Google in background.
 */
export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 60,
  categoryInput?: string | null
): Promise<ActivitySearchResponse> {
  const q = query.trim();
  const category: PlaceCategoryId = isPlaceCategoryId(categoryInput)
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

  const primary = bounds[0];
  const cacheKey = buildPlacesCacheKey({
    lat: primary.lat,
    lng: primary.lng,
    category,
    query: q,
    language: 'it',
  });

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const run = (async (): Promise<ActivitySearchResponse> => {
    const cached = await getPlacesFromDbCache(cacheKey);
    if (cached && cached.results.length > 0) {
      logApiMetric({
        service: 'places',
        op: 'activity-search',
        source: 'cache',
        extra: { stale: cached.stale, category },
      });

      if (cached.stale && hasGooglePlacesKey()) {
        // Stale-while-revalidate: non bloccare l’utente
        void fetchFromGoogle({
          q,
          bounds,
          maxRadiusKm,
          category,
          cacheKey,
          primary,
        });
      }

      return { results: cached.results, source: 'cache', category };
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

    return fetchFromGoogle({
      q,
      bounds,
      maxRadiusKm,
      category,
      cacheKey,
      primary,
    });
  })().finally(() => {
    inflight.delete(cacheKey);
  });

  inflight.set(cacheKey, run);
  return run;
}
