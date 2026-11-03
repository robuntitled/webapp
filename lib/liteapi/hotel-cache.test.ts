import { describe, expect, it } from 'vitest';
import {
  hotelCatalogCacheKey,
  hotelRatesCacheKey,
} from '@/lib/liteapi/hotel-cache';

describe('hotel cache keys', () => {
  it('normalizes city/country', () => {
    expect(hotelCatalogCacheKey('it', 'Bangkok')).toBe('hotels:catalog:IT:bangkok');
    expect(
      hotelRatesCacheKey({
        cityName: 'Bangkok',
        countryCode: 'th',
        checkin: '2026-12-01',
        checkout: '2026-12-05',
        adults: 2,
        childrenAges: [],
        currency: 'EUR',
      })
    ).toContain('hotels:rates:TH:bangkok:2026-12-01');
  });
});
