import { describe, expect, it } from 'vitest';
import {
  buildIntercountryHops,
  multiCountryGateHubs,
} from '@/lib/travel/intercountry-legs';

describe('intercountry-legs', () => {
  it('builds 1 hop for 2 countries (VN+KH → SGN→REP)', () => {
    const hops = buildIntercountryHops({
      orderedSlugs: ['vietnam', 'cambogia'],
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      shareDays: [9, 4],
    });
    expect(hops).toHaveLength(1);
    expect(hops[0]!.originIata).toBe('SGN');
    expect(hops[0]!.destinationIata).toBe('REP');
    expect(hops[0]!.labelIt).toMatch(/Tra paesi/);
    expect(hops[0]!.curated).toBe(true);
  });

  it('builds 2 hops for 3 countries', () => {
    const hops = buildIntercountryHops({
      orderedSlugs: ['vietnam', 'cambogia', 'thailandia'],
      dateFrom: '2026-12-01',
      dateTo: '2026-12-28',
      shareDays: [9, 8, 8],
    });
    expect(hops).toHaveLength(2);
    expect(hops[0]!.fromSlug).toBe('vietnam');
    expect(hops[0]!.toSlug).toBe('cambogia');
    expect(hops[1]!.fromSlug).toBe('cambogia');
    expect(hops[1]!.toSlug).toBe('thailandia');
  });

  it('gate hubs for curated VN+KH', () => {
    const hubs = multiCountryGateHubs(['vietnam', 'cambogia']);
    expect(hubs.arrivalIata).toBe('HAN');
    expect(hubs.departureIata).toBe('REP');
  });
});
