import { haversineKm } from '@/lib/maps/distance';

export type AirportSize = 'hub' | 'medium' | 'regional';
export type TripHaul = 'short' | 'medium' | 'long';

export type RankableAirport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

export type RankedOriginAirport = RankableAirport & {
  distanceKm: number | null;
  size: AirportSize;
  haul: TripHaul;
  score: number;
  recommended: boolean;
  reason: string;
};

/** Hub intercontinentali — da qui partono Australia, Asia, Americhe. */
export const LONG_HAUL_HUBS = new Set([
  'FCO',
  'MXP',
  'CDG',
  'ORY',
  'LHR',
  'LGW',
  'FRA',
  'MUC',
  'AMS',
  'MAD',
  'BCN',
  'VIE',
  'ZRH',
  'BRU',
  'CPH',
  'ARN',
  'OSL',
  'DUB',
  'LIS',
  'ATH',
  'IST',
  'DXB',
  'DOH',
  'JFK',
  'EWR',
  'ORD',
  'LAX',
  'SFO',
  'MIA',
  'NRT',
  'HND',
  'SIN',
  'HKG',
  'SYD',
  'MEL',
  'BKK',
  'ICN',
  'PVG',
]);

const REGIONAL_IATA = new Set([
  'AOI',
  'PSR',
  'PEG',
  'TRS',
  'GOA',
  'BDS',
  'SUF',
  'REG',
  'CUF',
  'ALL',
  'LMP',
  'PNL',
  'CIY',
  'QSR',
  'FOG',
  'CRV',
  'EBA',
  'GRS',
]);

export function airportSize(iata: string, name: string): AirportSize {
  const code = iata.trim().toUpperCase();
  if (LONG_HAUL_HUBS.has(code)) return 'hub';
  if (REGIONAL_IATA.has(code)) return 'regional';
  if (/international/i.test(name)) return 'hub';
  return 'medium';
}

export function tripHaulKm(distanceKm: number | null): TripHaul {
  if (distanceKm == null) return 'medium';
  if (distanceKm < 900) return 'short';
  if (distanceKm < 2800) return 'medium';
  return 'long';
}

export function rankOriginAirports(params: {
  airports: RankableAirport[];
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
}): RankedOriginAirport[] {
  const haul = tripHaulKm(
    params.origin && params.destination
      ? haversineKm(params.origin, params.destination)
      : null
  );

  const ranked = params.airports
    .filter((a) => a.iata && Number.isFinite(a.lat) && Number.isFinite(a.lon))
    .map((airport) => {
      const size = airportSize(airport.iata, airport.name);
      const distanceKm = params.origin
        ? haversineKm(params.origin, { lat: airport.lat, lng: airport.lon })
        : null;
      let score = distanceKm ?? 400;
      if (haul === 'long' && size === 'regional') score += 900;
      if (haul === 'long' && size === 'medium') score += 180;
      if (haul === 'medium' && size === 'regional') score += 120;
      if (haul === 'short' && size === 'hub' && (distanceKm ?? 0) > 160) score += 70;

      let reason = 'Aeroporto LiteAPI vicino a te.';
      if (haul === 'long' && size === 'hub') {
        reason = 'Hub intercontinentale: adatto a tratte lunghe (Australia, Asia, Americhe).';
      } else if (haul === 'long' && size !== 'hub') {
        reason = 'Più vicino, ma per questa tratta i voli lunghi partono da un hub.';
      } else if (haul === 'short' && size === 'regional') {
        reason = 'Il più vicino: va bene per voli corti in Europa.';
      } else if (size === 'hub') {
        reason = 'Hub con più rotte LiteAPI.';
      }

      return {
        ...airport,
        iata: airport.iata.toUpperCase(),
        distanceKm,
        size,
        haul,
        score,
        recommended: false,
        reason,
      };
    })
    .sort((a, b) => a.score - b.score);

  if (ranked[0]) ranked[0].recommended = true;
  return ranked.slice(0, 8);
}
