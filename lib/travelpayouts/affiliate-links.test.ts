import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAviasalesAffiliateUrl,
  buildHotellookAffiliateUrl,
  wrapTpMediaAffiliateUrl,
} from '@/lib/travelpayouts/affiliate-links';

describe('affiliate links', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('wraps target url with tp.media marker', () => {
    const url = wrapTpMediaAffiliateUrl('123456', 4117, 'https://www.aviasales.com/search/ROM0108BKK15081', 'test');
    expect(url).toContain('https://tp.media/r');
    expect(url).toContain('marker=123456.test');
    expect(url).toContain('p=4117');
    expect(url).toContain(encodeURIComponent('https://www.aviasales.com/search/ROM0108BKK15081'));
  });

  it('builds aviasales affiliate url with marker only', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA', 'ROM');

    const url = buildAviasalesAffiliateUrl(
      {
        destination: 'Thailandia',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        tripId: 'trip-1',
      },
      '999'
    );

    expect(url).toContain('tp.media');
    expect(url).toContain('marker=999.trip_trip_1_voli');
  });

  it('builds hotellook affiliate url', () => {
    const url = buildHotellookAffiliateUrl(
      {
        destination: 'Bali',
        startDate: '2026-09-01',
        endDate: '2026-09-08',
        tripId: 't1',
      },
      '888'
    );

    expect(url).toContain('tp.media');
    expect(url).toContain('p=607');
  });
});