import { describe, expect, it } from 'vitest';
import { searchMajorPlaces } from '@/lib/composer/major-places';
import { countriesInRegion } from '@/lib/composer/continent-countries';

describe('searchMajorPlaces', () => {
  it('finds countries and world cities', () => {
    const hits = searchMajorPlaces('maldive');
    expect(hits.some((h) => h.label === 'Maldive')).toBe(true);
    const tokyo = searchMajorPlaces('tokyo');
    expect(tokyo.some((h) => h.label === 'Tokyo')).toBe(true);
  });

  it('returns nothing for small towns', () => {
    expect(searchMajorPlaces('Altidona')).toEqual([]);
    expect(searchMajorPlaces('Monte San Giusto')).toEqual([]);
  });
});

describe('countriesInRegion', () => {
  it('lists every country of a continent', () => {
    const asia = countriesInRegion('Asia');
    expect(asia.length).toBeGreaterThan(20);
    expect(asia.some((c) => c.label === 'Thailandia')).toBe(true);
    expect(asia.some((c) => c.label === 'Giappone')).toBe(true);
  });
});
