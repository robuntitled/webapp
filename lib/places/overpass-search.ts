import 'server-only';

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
  if (tags.amenity === 'ice_cream') return 'Gelateria';
  if (tags.tourism === 'museum' || tags.amenity === 'museum') return 'Museo';
  if (tags.tourism === 'gallery') return 'Galleria';
  if (tags.tourism === 'viewpoint') return 'Panorama';
  if (tags.tourism === 'hotel' || tags.tourism === 'guest_house') return 'Alloggio';
  if (tags.tourism === 'attraction' || tags.tourism === 'yes') return 'Attrazione';
  if (tags.historic === 'castle' || tags.historic === 'fort') return 'Castello';
  if (tags.historic === 'monument' || tags.historic === 'memorial') return 'Monumento';
  if (tags.historic) return 'Storico';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'Parco';
  if (tags.leisure === 'sports_centre' || tags.leisure === 'fitness_centre') return 'Sport';
  if (tags.leisure === 'swimming_pool') return 'Piscina';
  if (tags.leisure || tags.sport) return 'Attività';
  if (tags.amenity === 'place_of_worship') return 'Luogo di culto';
  if (tags.amenity === 'cinema') return 'Cinema';
  if (tags.amenity === 'theatre') return 'Teatro';
  if (tags.amenity) return tags.amenity.replace(/_/g, ' ');
  if (tags.tourism) return tags.tourism.replace(/_/g, ' ');
  if (tags.shop) return tags.shop.replace(/_/g, ' ');
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
 * POI interessanti nell'area (senza filtro nome): mix turismo, cibo, leisure, storico.
 */
function nearbyInterestingClauses(around: string): string {
  return `
  nwr["tourism"]${around};
  nwr["historic"]${around};
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|biergarten|food_court|ice_cream|bistro|museum|theatre|cinema|place_of_worship|arts_centre|marketplace|nightclub|casino|library|fountain)$"]${around};
  nwr["leisure"~"^(park|garden|nature_reserve|sports_centre|fitness_centre|swimming_pool|stadium|marina|water_park|beach_resort)$"]${around};
  nwr["shop"~"^(bakery|pastry|mall|department_store|supermarket)$"]${around};
`.trim();
}

/**
 * Ricerca luoghi via Overpass — senza categorie.
 * - query vuota / corta → POI interessanti nell'area mappa
 * - query con testo → tutti i nomi che matchano nella zona
 */
export async function searchOverpassNearby(
  query: string,
  bounds: Bounds[],
  limit = 16
): Promise<OverpassPlace[]> {
  if (bounds.length === 0) return [];

  const primary = bounds[0];
  const q = query.trim();
  const outLimit = Math.min(limit * 5, 80);

  // Area mappa: raggio più stretto per i default, più ampio per la ricerca testuale
  const radiusM = q
    ? Math.min(Math.round((primary.radiusKm ?? 50) * 1000), 45_000)
    : Math.min(Math.round((primary.radiusKm ?? 25) * 1000), 20_000);

  const around = `(around:${radiusM},${primary.lat},${primary.lng})`;

  if (q.length >= 2) {
    const token = q.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Nome ovunque nella zona — nessun filtro categoria
    const clauses = `
  nwr[~"^name(:[a-z]{2})?$"~"${token}",i]${around};
`.trim();
    const els = await runOverpass(overpassBody(clauses, outLimit));
    const byName = elementsToPlaces(els, primary.label, limit, q);
    if (byName.length > 0) return byName;

    // Fallback: POI in zona il cui nome contiene la query (da set interessante)
    const browseEls = await runOverpass(
      overpassBody(nearbyInterestingClauses(around), outLimit)
    );
    return elementsToPlaces(browseEls, primary.label, limit, q);
  }

  // Default: luoghi nell'area visualizzata
  const els = await runOverpass(overpassBody(nearbyInterestingClauses(around), outLimit));
  return elementsToPlaces(els, primary.label, limit);
}
