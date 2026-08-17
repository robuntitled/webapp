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

  it('picks the nearest regional airport for a short European hop', () => {
    const ranked = rankOriginAirports({
      airports: [aoi, fco, mxp],
      origin: altidona,
      destination: { lat: 37.9838, lng: 23.7275 },
    });
    expect(ranked[0]?.iata).toBe('AOI');
  });
});
