import { describe, expect, it } from 'vitest';
import { parseNominatimResult, placeTypeLabel } from '@/lib/places/nominatim';

describe('parseNominatimResult', () => {
  it('parses a city with address details', () => {
    const result = parseNominatimResult({
      place_id: 123,
      lat: '48.8566',
      lon: '2.3522',
      display_name: 'Parigi, Île-de-France, Francia',
      type: 'city',
      class: 'place',
      name: 'Parigi',
      address: { country: 'Francia', state: 'Île-de-France', country_code: 'fr' },
    });

    expect(result.label).toBe('Parigi');
    expect(result.country).toBe('Francia');
    expect(result.countryCode).toBe('FR');
    expect(result.placeTypeLabel).toBe('Città');
    expect(result.lat).toBeCloseTo(48.8566);
  });

  it('parses a village', () => {
    const result = parseNominatimResult({
      place_id: 456,
      lat: '40.1209',
      lon: '9.0129',
      display_name: 'Baunei, Sardegna, Italia',
      type: 'village',
      class: 'place',
      address: { village: 'Baunei', state: 'Sardegna', country: 'Italia', country_code: 'it' },
    });

    expect(result.label).toBe('Baunei');
    expect(result.placeTypeLabel).toBe('Paese');
  });
});

describe('placeTypeLabel', () => {
  it('returns Italian labels', () => {
    expect(placeTypeLabel('country')).toBe('Nazione');
    expect(placeTypeLabel('unknown')).toBe('Luogo');
  });
});