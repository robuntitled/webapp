import { describe, expect, it } from 'vitest';
import {
  parseNominatimResult,
  placeTypeLabel,
  resolvePlaceType,
} from '@/lib/places/nominatim';

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

    expect(result).not.toBeNull();
    expect(result!.label).toBe('Parigi');
    expect(result!.country).toBe('Francia');
    expect(result!.countryCode).toBe('FR');
    expect(result!.placeTypeLabel).toBe('Città');
    expect(result!.lat).toBeCloseTo(48.8566);
  });

  it('prefers Latin name from namedetails over local script', () => {
    const result = parseNominatimResult({
      place_id: 789,
      lat: '35.6762',
      lon: '139.6503',
      display_name: '東京, 日本',
      type: 'city',
      class: 'place',
      name: '東京',
      namedetails: { name: '東京', 'name:en': 'Tokyo', 'name:it': 'Tokyo' },
      address: { country: 'Giappone', country_code: 'jp' },
    });

    expect(result).not.toBeNull();
    expect(result!.label).toBe('Tokyo');
    expect(result!.country).toBe('Giappone');
  });

  it('drops results without any Latin name', () => {
    const result = parseNominatimResult({
      place_id: 1,
      lat: '35.0',
      lon: '139.0',
      display_name: '東京, 日本',
      type: 'city',
      class: 'place',
      name: '東京',
      namedetails: { name: '東京' },
      address: { country: '日本', country_code: 'jp' },
    });
    expect(result).toBeNull();
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

    expect(result).not.toBeNull();
    expect(result!.label).toBe('Baunei');
    expect(result!.placeTypeLabel).toBe('Paese');
  });

  it('labels country-level administrative boundaries as Nazione', () => {
    const result = parseNominatimResult({
      place_id: 99,
      lat: '15.0',
      lon: '100.0',
      display_name: 'Thailandia',
      type: 'administrative',
      class: 'boundary',
      name: 'Thailandia',
      address: { country: 'Thailandia', country_code: 'th' },
    });
    expect(result).not.toBeNull();
    expect(result!.placeType).toBe('country');
    expect(result!.placeTypeLabel).toBe('Nazione');
  });
});

describe('placeTypeLabel', () => {
  it('returns Italian labels', () => {
    expect(placeTypeLabel('country')).toBe('Nazione');
    expect(placeTypeLabel('unknown')).toBe('Luogo');
  });
});

describe('resolvePlaceType', () => {
  it('maps boundary+administrative without city to country', () => {
    expect(
      resolvePlaceType({
        place_id: 1,
        lat: '0',
        lon: '0',
        display_name: 'Italia',
        type: 'administrative',
        class: 'boundary',
        address: { country: 'Italia', country_code: 'it' },
      })
    ).toBe('country');
  });
});
