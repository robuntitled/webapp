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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function typeLabel(tags: Record<string, string | undefined>): string {
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') {
    return 'Ristorante';
  }
  if (tags.tourism === 'museum' || tags.amenity === 'museum') return 'Museo';
  if (tags.tourism === 'attraction' || tags.tourism === 'viewpoint') return 'Attrazione';
  if (tags.tourism === 'hotel' || tags.tourism === 'guest_house') return 'Hotel';
  if (tags.leisure === 'park') return 'Parco';
  if (tags.historic) return 'Storico';
  if (tags.amenity) return tags.amenity.replace(/_/g, ' ');
  if (tags.tourism) return tags.tourism.replace(/_/g, ' ');
  return 'Luogo';
}

/**
 * Ricerca POI vicino a un punto via Overpass (OpenStreetMap).
 * Non richiede Google Places API.
 */
export async function searchOverpassNearby(
  query: string,
  bounds: Bounds[],
  limit = 12
): Promise<OverpassPlace[]> {
  const q = query.trim();
  if (q.length < 2 || bounds.length === 0) return [];

  const primary = bounds[0];
  const radiusM = Math.min(Math.round((primary.radiusKm ?? 80) * 1000), 50_000);
  const token = escapeRegex(q.slice(0, 60));

  // name match near destination; also try common amenity classes if query is generic
  const amenityBoost =
    /ristor|pizza|caf|bar|trattor|oster/i.test(q)
      ? `nwr["amenity"~"restaurant|cafe|fast_food|bar|pub",i](around:${radiusM},${primary.lat},${primary.lng});`
      : /muse|attraz|monum|chiesa|tempio|galleria/i.test(q)
        ? `nwr["tourism"~"museum|attraction|gallery|artwork",i](around:${radiusM},${primary.lat},${primary.lng});
           nwr["historic"](around:${radiusM},${primary.lat},${primary.lng});`
        : /tour|attiv|sport|spa|kayak|bike/i.test(q)
          ? `nwr["tourism"~"attraction|theme_park|zoo",i](around:${radiusM},${primary.lat},${primary.lng});
             nwr["leisure"~"sports_centre|park|fitness_centre",i](around:${radiusM},${primary.lat},${primary.lng});`
          : '';

  const body = `
[out:json][timeout:22];
(
  nwr["name"~"${token}",i](around:${radiusM},${primary.lat},${primary.lng});
  nwr["name:it"~"${token}",i](around:${radiusM},${primary.lat},${primary.lng});
  nwr["name:en"~"${token}",i](around:${radiusM},${primary.lat},${primary.lng});
  ${amenityBoost}
);
out center ${Math.min(limit * 3, 40)};
`.trim();

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  type OverpassElement = {
    id: number;
    type: string;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  };
  type OverpassResponse = { elements?: OverpassElement[] };

  let elements: OverpassElement[] = [];

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
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as OverpassResponse;
      if (data.elements?.length) {
        elements = data.elements;
        break;
      }
    } catch {
      // try next endpoint
    }
  }

  if (elements.length === 0) return [];

  const seen = new Set<string>();
  const places: OverpassPlace[] = [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    const name = (tags.name || tags['name:it'] || tags['name:en'] || '').trim();
    if (lat == null || lng == null || !name) continue;
    if (!isLatinScriptText(name)) continue;

    const key = `${name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const city =
      tags['addr:city'] ||
      tags['addr:place'] ||
      tags['addr:suburb'] ||
      primary.label ||
      '';
    const subtitle = [city, tags['addr:street']].filter(Boolean).join(', ');

    places.push({
      id: `osm-${el.type}-${el.id}`,
      label: name,
      subtitle: subtitle && isLatinScriptText(subtitle) ? subtitle : primary.label || '',
      lat,
      lng,
      placeTypeLabel: typeLabel(tags),
    });

    if (places.length >= limit) break;
  }

  return places;
}
