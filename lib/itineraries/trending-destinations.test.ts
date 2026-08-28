import { describe, expect, it } from 'vitest';
import { buildTrendingCarouselItems } from '@/lib/itineraries/trending-destinations';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

const sampleEditions: OfficialEditionCard[] = [
  {
    id: '1',
    template_id: 'thailandia-10',
    date_from: '2026-06-01',
    date_to: '2026-06-10',
    min_confirmed: 4,
    confirmed_count: 2,
    interested_count: 0,
    status: 'open',
    edition_type: 'official',
  },
];

describe('buildTrendingCarouselItems', () => {
  it('places two destinations then public hub as third item', () => {
    const items = buildTrendingCarouselItems(
      [
        { slug: 'thailandia', name: 'Thailandia', published: true },
        { slug: 'giappone', name: 'Giappone', published: true },
      ],
      sampleEditions
    );

    expect(items[0]).toMatchObject({ kind: 'destination', slug: 'thailandia' });
    expect(items[1]?.kind).toBe('destination');
    expect(items[2]).toMatchObject({ kind: 'public-hub', ctaLabel: 'Esplora partenze' });
  });
});
