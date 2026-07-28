import 'server-only';

import { viatorFetch } from '@/lib/viator/client';

type DestFreetext = {
  destinations?: {
    results?: Array<{ id?: number; name?: string }>;
  };
};

/** Risolve nome città → destinationId Viator (freetext DESTINATIONS). */
export async function resolveViatorDestinationId(
  city: string
): Promise<{ id: string; name: string } | null> {
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
  return { id: String(hit.id), name: hit.name?.trim() || term };
}
