import 'server-only';

import {
  hasGooglePlacesKey,
  searchGooglePlacesInBounds,
  searchGooglePlacesNearby,
  type GooglePlaceResult,
} from '@/lib/places/google-text-search';

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
};

/**
 * Solo Google Places (veloce).
 * Niente Overpass/Nominatim in cascata: erano la causa principale di lentezza
 * quando Google restituiva vuoto o era un po’ lento.
 */
export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 60
): Promise<ActivitySearchResponse> {
  const q = query.trim();

  if (bounds.length === 0) {
    return {
      results: [],
      source: 'none',
      warning:
        'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.',
    };
  }

  if (!hasGooglePlacesKey()) {
    return {
      results: [],
      source: 'none',
      warning:
        'Manca la chiave Google Maps su Vercel (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY o GOOGLE_MAPS_API_KEY).',
    };
  }

  try {
    if (q.length < 2) {
      const nearby = await searchGooglePlacesNearby(bounds, 30, 14);
      if (nearby.ok && nearby.results.length > 0) {
        return { results: nearby.results, source: 'google' };
      }
      return {
        results: [],
        source: 'none',
        warning:
          nearby.errorMessage ||
          'Nessun luogo nell’area. Verifica che Places API (New) sia abilitata sulla key.',
      };
    }

    const text = await searchGooglePlacesInBounds(q, bounds, maxRadiusKm);
    if (text.ok && text.results.length > 0) {
      return { results: text.results, source: 'google' };
    }
    return {
      results: [],
      source: 'none',
      warning:
        text.errorMessage ||
        'Nessun risultato. Prova un nome diverso o più generico.',
    };
  } catch {
    return {
      results: [],
      source: 'none',
      warning: 'Ricerca Google non disponibile al momento. Riprova.',
    };
  }
}
