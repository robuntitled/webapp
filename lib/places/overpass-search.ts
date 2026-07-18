import 'server-only';

import {
  buildOverpassCategoryClauses,
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  if (tags.tourism === 'museum' || tags.amenity === 'museum') return 'Museo';
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return 'Attrazione';
  if (tags.historic) return 'Storico';
  if (tags.leisure === 'park') return 'Parco';
  if (tags.leisure || tags.sport) return 'Attività';
  if (tags.amenity) return tags.amenity.replace(/_/g, ' ');
  if (tags.tourism) return tags.tourism.replace(/_/g, ' ');
  return 'Luogo';
}

function matchesCategoryTags(
  tags: Record<string, string | undefined>,
  category: ActivityPlaceCategory
): boolean {
  const amenity = (tags.amenity || '').toLowerCase();
  const tourism = (tags.tourism || '').toLowerCase();
  const leisure = (tags.leisure || '').toLowerCase();
  const shop = (tags.shop || '').toLowerCase();
  const hasHistoric = Boolean(tags.historic);
  const hasSport = Boolean(tags.sport);

  if (category === 'meal') {
    return (
      /^(restaurant|cafe|fast_food|bar|pub|biergarten|food_court|ice_cream|bistro)$/.test(
        amenity
      ) || /^(bakery|pastry|coffee)$/.test(shop)
    );
  }

  if (category === 'attraction') {
    if (hasHistoric) return true;
    if (
      /^(attraction|museum|gallery|artwork|viewpoint|zoo|theme_park|aquarium|yes)$/.test(
        tourism
      )
    ) {
      return true;
    }
    return /^(place_of_worship|theatre|arts_centre)$/.test(amenity);
  }

  // activity
  if (hasSport) return true;
  if (
    /^(sports_centre|fitness_centre|swimming_pool|stadium|pitch|track|golf_course|water_park|park|ice_rink|bowling_alley|trampoline_park)$/.test(
      leisure
    )
  ) {
    return true;
  }
  if (/^(theme_park|zoo|aquarium|picnic_site)$/.test(tourism)) return true;
  return /^(community_centre|casino|nightclub|events_venue)$/.test(amenity);
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
  nameFilter?: string
): OverpassPlace[] {
  const seen = new Set<string>();
  const places: OverpassPlace[] = [];
  const nameQ = nameFilter?.trim().toLowerCase() ?? '';

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    const name = (tags.name || tags['name:it'] || tags['name:en'] || '').trim();
    if (lat == null || lng == null || !name) continue;
    if (!isLatinScriptText(name)) continue;
    if (category && !matchesCategoryTags(tags, category)) continue;
    if (nameQ && !name.toLowerCase().includes(nameQ)) continue;

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

/**
 * Ricerca POI settorializzata (attrazioni / attività / ristoranti) via Overpass.
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
  const radiusM = Math.min(Math.round((primary.radiusKm ?? 80) * 1000), 50_000);
  const token = escapeRegex(q.slice(0, 60));
  const around = `(around:${radiusM},${primary.lat},${primary.lng})`;

  let clauses: string;

  if (category) {
    // 1) POI della categoria con nome che matcha
    // 2) POI della categoria in zona (riempimento)
    const cat = buildOverpassCategoryClauses(
      category,
      primary.lat,
      primary.lng,
      radiusM
    );
    clauses = `
  nwr["name"~"${token}",i]${around};
  nwr["name:it"~"${token}",i]${around};
  nwr["name:en"~"${token}",i]${around};
  ${cat}
`.trim();
  } else {
    clauses = `
  nwr["name"~"${token}",i]${around};
  nwr["name:it"~"${token}",i]${around};
  nwr["name:en"~"${token}",i]${around};
`.trim();
  }

  const body = `
[out:json][timeout:22];
(
  ${clauses}
);
out center ${Math.min(limit * 4, 50)};
`.trim();

  const elements = await runOverpass(body);
  if (elements.length === 0) return [];

  // Prima i match per nome nella categoria, poi altri della categoria
  const byName = elementsToPlaces(elements, primary.label, limit, category, q);
  if (byName.length >= Math.min(6, limit)) return byName;

  const byCategory = category
    ? elementsToPlaces(elements, primary.label, limit, category, undefined)
    : elementsToPlaces(elements, primary.label, limit, null, q);

  const seen = new Set(byName.map((p) => p.id));
  const merged = [...byName];
  for (const p of byCategory) {
    if (seen.has(p.id)) continue;
    // se c'è una query, preferisci nomi che la contengono; altrimenti prendi i POI categoria
    if (q.length >= 2 && !p.label.toLowerCase().includes(q.toLowerCase())) {
      // ancora ok per riempire lista settoriale
      if (byName.length >= 3) continue;
    }
    seen.add(p.id);
    merged.push(p);
    if (merged.length >= limit) break;
  }

  return merged.slice(0, limit);
}
