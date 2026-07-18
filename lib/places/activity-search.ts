import 'server-only';

import { haversineKm } from '@/lib/maps/distance';
import {
  hasGooglePlacesKey,
  searchGooglePlacesInBounds,
  searchGooglePlacesNearby,
  type GooglePlaceResult,
} from '@/lib/places/google-text-search';
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

async function searchWithNominatim(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm: number
): Promise<ActivityPlaceResult[]> {
  const primary = bounds[0];
  const contextual = primary.label ? `${query} ${primary.label}` : query;
  const places = await searchPlaces(contextual, 16);
  const mapped: ActivityPlaceResult[] = places.map((place) => ({
    id: place.id,
    label: place.label,
    subtitle: place.subtitle,
    lat: place.lat,
    lng: place.lng,
    placeTypeLabel: place.placeTypeLabel,
  }));
  const inBounds = filterByBounds(mapped, bounds, maxRadiusKm);
  return (inBounds.length > 0 ? inBounds : mapped).slice(0, 16);
}

/**
 * Priorità: Google Places (veloce + qualità) → Overpass → Nominatim.
 * Query vuota = luoghi popolari nell’area mappa (Nearby Search).
 */
export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 80
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

  // ── 1) Google Places (primario) ──────────────────────────────────────────
  if (hasGooglePlacesKey()) {
    try {
      if (q.length < 2) {
        const nearby = await searchGooglePlacesNearby(bounds, 30, 16);
        if (nearby.ok && nearby.results.length > 0) {
          return { results: nearby.results, source: 'google' };
        }
      } else {
        const text = await searchGooglePlacesInBounds(q, bounds, maxRadiusKm);
        if (text.ok && text.results.length > 0) {
          return { results: text.results, source: 'google' };
        }
      }
    } catch {
      // fallback sotto
    }
  }

  // ── 2) Overpass (fallback gratuito, più lento) ───────────────────────────
  try {
    const overpassResults = await searchOverpassNearby(q, bounds, 16);
    if (overpassResults.length > 0) {
      return {
        results: overpassResults,
        source: 'overpass',
        warning: hasGooglePlacesKey()
          ? undefined
          : 'Risultati OSM (configura Google Places per risultati più rapidi).',
      };
    }
  } catch {
    // continue
  }

  // ── 3) Nominatim (solo con testo) ────────────────────────────────────────
  if (q.length >= 2) {
    try {
      const nominatimResults = await searchWithNominatim(q, bounds, maxRadiusKm);
      if (nominatimResults.length > 0) {
        return { results: nominatimResults, source: 'nominatim' };
      }
    } catch {
      // continue
    }
  }

  return {
    results: [],
    source: 'none',
    warning: !hasGooglePlacesKey()
      ? 'Aggiungi la chiave Google Maps / Places su Vercel per risultati rapidi e di qualità.'
      : q.length >= 2
        ? 'Nessun risultato vicino alle destinazioni. Prova un nome diverso.'
        : 'Nessun luogo trovato nell’area della mappa. Prova a cercare un nome.',
  };
}
