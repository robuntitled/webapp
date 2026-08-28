import { describe, expect, it } from 'vitest';
import {
  aggregatePublicDestinations,
  filterEditionsByDestinationSlug,
  partenzeCtaLabel,
} from '@/lib/itineraries/public-destinations';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

const thailand10: OfficialEditionCard = {
  id: '1',
  template_id: 'thailandia-10d',
  date_from: '2027-01-08',
  date_to: '2027-01-17',
  min_confirmed: 6,
  confirmed_count: 1,
  status: 'open',
};

const thailand21: OfficialEditionCard = {
  ...thailand10,
  id: '2',
  template_id: 'thailandia-21d',
  date_from: '2027-02-01',
  date_to: '2027-02-21',
};

describe('public destinations', () => {
  it('aggregates editions by destination slug', () => {
    const list = aggregatePublicDestinations([thailand10, thailand21, thailand10]);
    expect(list).toHaveLength(1);
    expect(list[0]?.slug).toBe('thailandia');
    expect(list[0]?.editionCount).toBe(3);
    expect(list[0]?.name).toBe('Thailandia');
  });

  it('filters editions by slug', () => {
    const filtered = filterEditionsByDestinationSlug([thailand10, thailand21], 'thailandia');
    expect(filtered).toHaveLength(2);
  });

  it('formats CTA label', () => {
    expect(partenzeCtaLabel(1)).toBe('Vedi 1 partenza');
    expect(partenzeCtaLabel(3)).toBe('Vedi 3 partenze');
  });
});
