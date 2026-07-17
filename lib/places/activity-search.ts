import 'server-only';

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

function buildContextQuery(query: string, bounds: ActivitySearchBounds[]): string {
  const labels = bounds
    .map((b) => b.label?.trim())
    .filter((label): label is string => Boolean(label));
  if (labels.length === 0) return query.trim();
  const context = labels.slice(0, 2).join(' ');
  return `${query.trim()} ${context}`.trim();
}

async function searchWithNominatim(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm: number
): Promise<ActivityPlaceResult[]> {
  const primary = bounds[0];
  const contextualQuery = buildContextQuery(query, bounds);

  // 1) free-text near destination label
  const places = await searchPlaces(contextualQuery, 20);

  // 2) also try viewbox-biased search around coords
  let viewboxPlaces: Awaited<ReturnType<typeof searchPlaces>> = [];
  try {
    const delta = Math.min(maxRadiusKm, 80) / 111; // ~degrees
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('namedetails', '1');
    url.searchParams.set('limit', '20');
    url.searchParams.set('accept-language', 'it,en');
    url.searchParams.set(
      'viewbox',
      `${primary.lng - delta},${primary.lat + delta},${primary.lng + delta},${primary.lat - delta}`
    );
    // not bounded=1: allow nearby results if viewbox is empty
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'NomadLink/1.0 (travel composer; contact@nomadlink.app)',
        Accept: 'application/json',
        'Accept-Language': 'it,en;q=0.9',
      },
      cache: 'no-store',
    });
    if (res.ok) {
      // reuse searchPlaces-like parse via second full query already done;
      // simpler: just use searchPlaces with "query near lat,lng"
      viewboxPlaces = await searchPlaces(
        `${query.trim()} ${primary.lat.toFixed(3)} ${primary.lng.toFixed(3)}`,
        12
      );
    }
  } catch {
    viewboxPlaces = [];
  }

  const merged = [...places, ...viewboxPlaces];
  const mapped: ActivityPlaceResult[] = merged.map((place) => ({
    id: place.id,
    label: place.label,
    subtitle: place.subtitle,
    lat: place.lat,
    lng: place.lng,
    placeTypeLabel: place.placeTypeLabel,
  }));

  // Dedupe
  const seen = new Set<string>();
  const unique: ActivityPlaceResult[] = [];
  for (const p of mapped) {
    const key = `${p.label.toLowerCase()}|${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }

  const filtered = filterByBounds(unique, bounds, maxRadiusKm);
  return (filtered.length > 0 ? filtered : unique).slice(0, 12);
}

/**
 * Google Places (se abilitato) → Nominatim → Overpass.
 * Non richiede Places API per funzionare.
 */
export async function searchActivitiesInBounds(
  query: string,
  bounds: ActivitySearchBounds[],
  maxRadiusKm = 120
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

  // 1) Google Places (optional)
  const google = await searchGooglePlacesInBounds(q, bounds, maxRadiusKm);
  if (google.ok && google.results.length > 0) {
    return { results: google.results, source: 'google' };
  }

  // 2) Nominatim free-text
  try {
    const nominatimResults = await searchWithNominatim(q, bounds, maxRadiusKm);
    if (nominatimResults.length > 0) {
      return {
        results: nominatimResults,
        source: 'nominatim',
        warning:
          google.status === 'REQUEST_DENIED' || google.status === 'MISSING_API_KEY'
            ? undefined // silent OSM success — no scary Google message
            : undefined,
      };
    }
  } catch {
    // continue to Overpass
  }

  // 3) Overpass nearby (works well without Google)
  try {
    const overpassResults = await searchOverpassNearby(q, bounds, 12);
    if (overpassResults.length > 0) {
      return {
        results: overpassResults,
        source: 'overpass',
      };
    }
  } catch {
    // fall through
  }

  return {
    results: [],
    source: 'none',
    warning:
      'Nessun risultato vicino alle destinazioni. Prova un nome più specifico (es. «Colosseo», «trattoria», «museo»).',
  };
}
