import 'server-only';

import { viatorFetch } from '@/lib/viator/client';

type DestFreetext = {
  destinations?: {
    results?: Array<{ id?: number; name?: string }>;
  };
};

type DestinationsTaxonomy = {
  destinations?: Array<{
    destinationId?: number;
    name?: string;
    center?: { latitude?: number; longitude?: number };
  }>;
};

export type ViatorDestinationMeta = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

let taxonomyCache:
  | {
      at: number;
      byId: Map<string, ViatorDestinationMeta>;
    }
  | null = null;

const TAXONOMY_TTL_MS = 24 * 60 * 60 * 1000;

async function ensureDestinationTaxonomy(): Promise<Map<string, ViatorDestinationMeta>> {
  if (taxonomyCache && Date.now() - taxonomyCache.at < TAXONOMY_TTL_MS) {
    return taxonomyCache.byId;
  }
  const data = await viatorFetch<DestinationsTaxonomy>('/destinations', {
    method: 'GET',
    timeoutMs: 25_000,
  });
  const byId = new Map<string, ViatorDestinationMeta>();
  for (const d of data.destinations ?? []) {
    if (d.destinationId == null) continue;
    const lat = d.center?.latitude;
    const lng = d.center?.longitude;
    byId.set(String(d.destinationId), {
      id: String(d.destinationId),
      name: d.name?.trim() || String(d.destinationId),
      lat:
        typeof lat === 'number' && Math.abs(lat) <= 90 && !(lat === 0 && lng === 0)
          ? lat
          : null,
      lng:
        typeof lng === 'number' && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
          ? lng
          : null,
    });
  }
  taxonomyCache = { at: Date.now(), byId };
  return byId;
}

/** Risolve nome città → destinationId (+ coordinate centro se disponibili). */
export async function resolveViatorDestinationId(
  city: string
): Promise<ViatorDestinationMeta | null> {
  const term = city.trim();
  if (!term) return null;

  const destRes = await viatorFetch<DestFreetext>('/search/freetext', {
    method: 'POST',
    body: JSON.stringify({
      searchTerm: term,
      searchTypes: [
        { searchType: 'DESTINATIONS', pagination: { start: 1, count: 1 } },
      ],
      currency: 'EUR',
    }),
    timeoutMs: 12_000,
  });

  const hit = destRes.destinations?.results?.[0];
  if (hit?.id == null) return null;
  const id = String(hit.id);
  const name = hit.name?.trim() || term;

  try {
    const byId = await ensureDestinationTaxonomy();
    const meta = byId.get(id);
    if (meta) {
      return { ...meta, name: meta.name || name };
    }
  } catch (e) {
    console.warn('[viator] /destinations taxonomy failed', e);
  }

  return { id, name, lat: null, lng: null };
}
