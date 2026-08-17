import { describe, expect, it } from 'vitest';
import { rankOriginAirports } from '@/lib/composer/origin-airport-rank';

describe('rankOriginAirports', () => {
  const aoi = {
    iata: 'AOI',
    name: 'Ancona Falconara',
    city: 'Ancona',
    country: 'Italy',
    lat: 43.6163,
    lon: 13.3623,
  };
  const fco = {
    iata: 'FCO',
    name: 'Rome Fiumicino International',
    city: 'Rome',
    country: 'Italy',
    lat: 41.8003,
    lon: 12.2389,
  };
  const mxp = {
    iata: 'MXP',
    name: 'Milan Malpensa',
    city: 'Milan',
    country: 'Italy',
    lat: 45.6306,
    lon: 8.7281,
  };
  const altidona = { lat: 43.106, lng: 13.798 };

  it('picks a long-haul hub for Australia even if a regional airport is closer', () => {
    const ranked = rankOriginAirports({
      airports: [aoi, fco, mxp],
      origin: altidona,
      destination: { lat: -33.8688, lng: 151.2093 },
    });
    expect(ranked[0]?.iata).toBe('FCO');
    expect(ranked[0]?.recommended).toBe(true);
    expect(ranked[0]?.size).toBe('hub');
    expect(ranked.find((a) => a.iata === 'AOI')?.score).toBeGreaterThan(ranked[0]!.score);
  });

  it('drops metro codes like ROM and returns at most 3 airports', () => {
    const rom = {
      iata: 'ROM',
      name: 'Rome – All Airports',
      city: 'Rome',
      country: 'Italy',
      lat: 41.8,
      lon: 12.2,
    };
    const ranked = rankOriginAirports({
      airports: [aoi, fco, mxp, rom],
      origin: altidona,
      destination: { lat: -33.8688, lng: 151.2093 },
    });
    expect(ranked.every((a) => a.iata !== 'ROM')).toBe(true);
    expect(ranked.length).toBeLessThanOrEqual(3);
  });

  it('does not treat every International airport as a long-haul hub', () => {
    const psa = {
      iata: 'PSA',
      name: 'Pisa International Airport',
      city: 'Pisa',
      country: 'Italy',
      lat: 43.6839,
      lon: 10.3927,
    };
    const ranked = rankOriginAirports({
      airports: [aoi, fco, psa],
      origin: altidona,
      destination: { lat: 4.1755, lng: 73.5093 },
    });
    expect(ranked[0]?.iata).toBe('FCO');
  });

  it('picks the nearest regional airport for a short European hop', () => {
    const ranked = rankOriginAirports({
      airports: [aoi, fco, mxp],
      origin: altidona,
      destination: { lat: 37.9838, lng: 23.7275 },
    });
    expect(ranked[0]?.iata).toBe('AOI');
  });
});
