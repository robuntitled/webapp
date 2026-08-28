import { aggregatePublicDestinations } from '@/lib/itineraries/public-destinations';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

export type TrendingDestinationItem = {
  slug: string;
  name: string;
};

export type TrendingPublicHubItem = {
  kind: 'public-hub';
  label: string;
  ctaLabel: string;
  editionCount: number;
};

export type TrendingDestinationCarouselItem =
  | ({ kind: 'destination' } & TrendingDestinationItem)
  | TrendingPublicHubItem;

/** Label CTA verso la sezione partenze pubbliche (ex «Pubblici»). */
export const PUBLIC_HUB_CTA_LABEL = 'Esplora partenze';

/**
 * Costruisce gli item del carosello Home.
 * Le prime due slot sono destinazioni reali; la terza è l'hub gruppo aperto.
 * Ordine pronto per ranking dinamico per click (rank opzionale in futuro).
 */
export function buildTrendingCarouselItems(
  catalogDestinations: { slug: string; name: string; published?: boolean }[],
  editions: OfficialEditionCard[]
): TrendingDestinationCarouselItem[] {
  const publicDests = aggregatePublicDestinations(editions);
  const seen = new Set<string>();
  const topDestinations: TrendingDestinationItem[] = [];

  const pushDest = (slug: string, name: string) => {
    if (seen.has(slug)) return;
    seen.add(slug);
    topDestinations.push({ slug, name });
  };

  for (const d of publicDests) {
    if (topDestinations.length >= 2) break;
    pushDest(d.slug, d.name);
  }

  if (topDestinations.length < 2) {
    for (const d of catalogDestinations) {
      if (topDestinations.length >= 2) break;
      if (d.published === false) continue;
      pushDest(d.slug, d.name);
    }
  }

  const extras: TrendingDestinationCarouselItem[] = [];
  for (const d of publicDests) {
    if (seen.has(d.slug)) continue;
    seen.add(d.slug);
    extras.push({ kind: 'destination', slug: d.slug, name: d.name });
    if (extras.length >= 6) break;
  }

  return [
    ...topDestinations.slice(0, 2).map((d) => ({ kind: 'destination' as const, ...d })),
    {
      kind: 'public-hub',
      label: 'Gruppo aperto',
      ctaLabel: PUBLIC_HUB_CTA_LABEL,
      editionCount: editions.length,
    },
    ...extras,
  ];
}
