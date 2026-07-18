import 'server-only';

import {
  buildOverpassCategoryClauses,
  isGenericCategoryQuery,
  tagsMatchActivityCategory,
  type ActivityPlaceCategory,
} from '@/lib/places/activity-categories';
import { isLatinScriptText } from '@/lib/places/latin-script';

export type OverpassPlace = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeTypeLabel: string;
};

type Bounds = { lat: number; lng: number; radiusKm?: number; label?: string };

function typeLabel(tags: Record<string, string | undefined>): string {
  if (
    tags.amenity === 'restaurant' ||
    tags.amenity === 'cafe' ||
    tags.amenity === 'fast_food' ||
    tags.amenity === 'bistro'
  ) {
    return 'Ristorante';
  }
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return 'Bar';
  if (tags.shop === 'bakery' || tags.shop === 'pastry') return 'Panetteria';
  if (tags.amenity === 'ice_cream' || tags.shop === 'confectionery') return 'Gelateria';
  if (tags.tourism === 'museum' || tags.amenity === 'museum') return 'Museo';
  if (tags.tourism === 'gallery') return 'Galleria';
  if (tags.tourism === 'viewpoint') return 'Panorama';
  if (tags.tourism === 'attraction' || tags.tourism === 'yes') return 'Attrazione';
  if (tags.historic === 'castle' || tags.historic === 'fort') return 'Castello';
  if (tags.historic === 'monument' || tags.historic === 'memorial') return 'Monumento';
  if (tags.historic === 'ruins' || tags.historic === 'archaeological_site') return 'Sito storico';
  if (tags.historic) return 'Storico';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'Parco';
  if (tags.leisure === 'sports_centre' || tags.leisure === 'fitness_centre') return 'Sport';
  if (tags.leisure === 'swimming_pool') return 'Piscina';
  if (tags.leisure || tags.sport) return 'Attività';
  if (tags.amenity === 'place_of_worship') return 'Luogo di culto';
  if (tags.amenity) return tags.amenity.replace(/_/g, ' ');
  if (tags.tourism) return tags.tourism.replace(/_/g, ' ');
  return 'Luogo';
}

async function runOverpass(body: string): Promise<
  Array<{
    id: number;
    type: string;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>
> {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NomadLink/1.0 (travel composer; contact@nomadlink.app)',
        },
        body: `data=${encodeURIComponent(body)}`,
        cache: 'no-store',
        signal: AbortSignal.timeout(22_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        elements?: Array<{
          id: number;
          type: string;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };
      if (data.elements?.length) return data.elements;
    } catch {
      // try next
    }
  }
  return [];
}

function elementsToPlaces(
  elements: Awaited<ReturnType<typeof runOverpass>>,
  primaryLabel: string | undefined,
  limit: number,
  category?: ActivityPlaceCategory | null,
  /** Se true, richiede che il nome contenga nameNeedle */
  nameNeedle?: string
): OverpassPlace[] {
  const seen = new Set<string>();
  const places: OverpassPlace[] = [];
  const needle = nameNeedle?.trim().toLowerCase() ?? '';

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    const name = (tags.name || tags['name:it'] || tags['name:en'] || '').trim();
    if (lat == null || lng == null || !name) continue;
    if (!isLatinScriptText(name)) continue;
    if (category && !tagsMatchActivityCategory(tags, category)) continue;
    if (needle && !name.toLowerCase().includes(needle)) continue;

    const key = `${name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const city =
      tags['addr:city'] || tags['addr:place'] || tags['addr:suburb'] || primaryLabel || '';
    const subtitle = [city, tags['addr:street']].filter(Boolean).join(', ');

    places.push({
      id: `osm-${el.type}-${el.id}`,
      label: name,
      subtitle: subtitle && isLatinScriptText(subtitle) ? subtitle : primaryLabel || '',
      lat,
      lng,
      placeTypeLabel: typeLabel(tags),
    });

    if (places.length >= limit) break;
  }

  return places;
}

function overpassBody(clauses: string, outLimit: number): string {
  return `
[out:json][timeout:20];
(
  ${clauses}
);
out center ${outLimit};
`.trim();
}

/**
 * Ricerca POI settorializzata (attrazioni / attività / ristoranti) via Overpass.
 *
 * Strategia:
 * 1) Categoria + nome (es. ristoranti con "pizza" nel nome) — risultati precisi
 * 2) Solo se la query è generica ("museo", "pizzeria", "piscina"): browse categoria in zona
 * 3) Nessun dump di POI random quando il nome non matcha in una tab sbagliata
 */
export async function searchOverpassNearby(
  query: string,
  bounds: Bounds[],
  limit = 12,
  category?: ActivityPlaceCategory | null
): Promise<OverpassPlace[]> {
  const q = query.trim();
  if (q.length < 2 || bounds.length === 0) return [];

  const primary = bounds[0];
  const radiusM = Math.min(Math.round((primary.radiusKm ?? 40) * 1000), 35_000);
  const outLimit = Math.min(limit * 5, 60);

  // --- Con categoria: query vincolate ai tag OSM della tab ---
  if (category) {
    // 1) Nome + categoria
    const namedClauses = buildOverpassCategoryClauses(
      category,
      primary.lat,
      primary.lng,
      radiusM,
      q.slice(0, 60)
    );
    const namedEls = await runOverpass(overpassBody(namedClauses, outLimit));
    const namedPlaces = elementsToPlaces(namedEls, primary.label, limit, category);

    if (namedPlaces.length >= Math.min(4, limit)) {
      return namedPlaces;
    }

    // 2) Query generica → elenco POI della categoria in zona (es. "museo", "piscina")
    if (isGenericCategoryQuery(q, category)) {
      const browseClauses = buildOverpassCategoryClauses(
        category,
        primary.lat,
        primary.lng,
        // raggio un po' più stretto per browse (meno rumore)
        Math.min(radiusM, 12_000),
        undefined
      );
      const browseEls = await runOverpass(overpassBody(browseClauses, outLimit));
      const browsePlaces = elementsToPlaces(browseEls, primary.label, limit, category);

      // Preferisci comunque i match per nome se ce n'erano
      if (namedPlaces.length === 0) return browsePlaces;

      const seen = new Set(namedPlaces.map((p) => p.id));
      const merged = [...namedPlaces];
      for (const p of browsePlaces) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push(p);
        if (merged.length >= limit) break;
      }
      return merged;
    }

    // Nome specifico: restituisci solo i match per nome (anche pochi).
    // Se zero → lascia che Nominatim/Google provino, non riempire con POI irrilevanti.
    return namedPlaces;
  }

  // --- Senza categoria: ricerca per nome generica ---
  const around = `(around:${radiusM},${primary.lat},${primary.lng})`;
  const token = q.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const freeClauses = `
  nwr[~"^name(:[a-z]{2})?$"~"${token}",i]${around};
`.trim();
  const freeEls = await runOverpass(overpassBody(freeClauses, outLimit));
  return elementsToPlaces(freeEls, primary.label, limit, null, q);
}
