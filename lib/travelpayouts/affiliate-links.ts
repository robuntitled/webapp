import { buildMarkerParam } from '@/lib/travelpayouts/config';
import { resolveDestinationIata } from '@/lib/travelpayouts/iata';
import type { FlightSearchParams } from '@/lib/travelpayouts/flight-search';
import { buildFlightSearchCode } from '@/lib/travelpayouts/flight-search';

/** Program ID Travelpayouts — Aviasales (voli). */
export const PROGRAM_AVIASALES = 4117;
/** Program ID Travelpayouts — Hotellook (hotel). */
export const PROGRAM_HOTELLOOK = 607;

const AVIASALES_SEARCH_BASE = 'https://www.aviasales.com/search';
const HOTELLOOK_SEARCH_BASE = 'https://search.hotellook.com/hotels';

export function getPublicMarker(): string | null {
  return process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim() || null;
}

/**
 * Redirect affiliate ufficiale Travelpayouts (tp.media).
 * @see https://support.travelpayouts.com/hc/en-us/articles/210615778-Tools-overview
 */
export function wrapTpMediaAffiliateUrl(
  marker: string,
  programId: number,
  targetUrl: string,
  subId?: string
): string {
  const markerParam = subId ? buildMarkerParam(marker, subId) : marker;
  const url = new URL('https://tp.media/r');
  url.searchParams.set('marker', markerParam);
  url.searchParams.set('p', String(programId));
  url.searchParams.set('u', targetUrl);
  return url.toString();
}

export function buildAviasalesDirectSearchUrl(params: FlightSearchParams): string | null {
  const code = buildFlightSearchCode(params);
  if (!code) return null;
  return `${AVIASALES_SEARCH_BASE}/${code}`;
}

export function buildAviasalesAffiliateUrl(
  params: FlightSearchParams,
  marker: string
): string | null {
  const direct = buildAviasalesDirectSearchUrl(params);
  if (!direct) return null;

  const subId = params.subId ?? (params.tripId ? `trip_${params.tripId}_voli` : 'voli');
  return wrapTpMediaAffiliateUrl(marker, PROGRAM_AVIASALES, direct, subId);
}

export type HotelAffiliateParams = {
  destination: string;
  startDate: string;
  endDate: string;
  tripId?: string;
  subId?: string;
};

export function buildHotellookAffiliateUrl(
  params: HotelAffiliateParams,
  marker: string
): string | null {
  const iata = resolveDestinationIata(params.destination);
  const url = new URL(HOTELLOOK_SEARCH_BASE);
  url.searchParams.set('languageCode', 'it');
  url.searchParams.set('currency', 'EUR');

  if (iata) {
    url.searchParams.set('destination', iata);
  } else {
    url.searchParams.set('destination', params.destination);
  }

  if (params.startDate) url.searchParams.set('checkIn', params.startDate);
  if (params.endDate) url.searchParams.set('checkOut', params.endDate);

  const subId = params.subId ?? (params.tripId ? `trip_${params.tripId}_hotel` : 'hotel');
  return wrapTpMediaAffiliateUrl(marker, PROGRAM_HOTELLOOK, url.toString(), subId);
}