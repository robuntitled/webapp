import { describe, expect, it } from 'vitest';
import { airportsForCountry } from '@/lib/travel/airports-by-country';

describe('airportsForCountry', () => {
  it('resolves Kenya hubs from the catalog', () => {
    expect(airportsForCountry('KE')).toEqual(['NBO', 'MBA']);
    expect(airportsForCountry('Kenya')).toEqual(['NBO', 'MBA']);
  });

  it('still resolves Italy with ranked hubs', () => {
    expect(airportsForCountry('IT').slice(0, 2)).toEqual(['FCO', 'MXP']);
  });
});
