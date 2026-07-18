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

/**
 * Google Places con filtro categoria.
 * Ordine: cache DB condivisa → Google → salva in DB.
 * Query vuota → browse categoria; testo (≥3) → Text Search.
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

  // ── 1) Cache DB condivisa (tutti gli utenti) ─────────────────────────────
  const cached = await getPlacesFromDbCache(cacheKey);
  if (cached && cached.length > 0) {
    return { results: cached, source: 'cache', category };
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
    let results: GooglePlaceResult[] = [];
    let warning: string | undefined;

    if (q.length < 3) {
      // Browse categoria (query vuota o troppo corta)
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
      // Scrivi cache condivisa (non attendere se fallisce)
      void setPlacesDbCache({
        cacheKey,
        lat: primary.lat,
        lng: primary.lng,
        category,
        query: q,
        results,
        language: 'it',
      });
      return { results, source: 'google', category };
    }

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
