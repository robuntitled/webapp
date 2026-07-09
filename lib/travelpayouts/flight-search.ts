import { buildMarkerParam, getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { resolveDestinationIata } from '@/lib/travelpayouts/iata';

export type FlightSearchParams = {
  originIata?: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: 'economy' | 'business' | 'comfort' | 'first';
  tripId?: string;
  subId?: string;
};

const CLASS_CODES: Record<NonNullable<FlightSearchParams['travelClass']>, string> = {
  economy: '',
  business: 'c',
  comfort: 'w',
  first: 'f',
};

function formatFlightDate(isoDate: string): string | null {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}${month}`;
}

function clampPassengerCount(value: number | undefined, fallback: number): number {
  const n = value ?? fallback;
  return Math.min(9, Math.max(0, Math.floor(n)));
}

/**
 * Costruisce il parametro flightSearch per White Label Page.
 * @see https://support.travelpayouts.com/hc/en-us/articles/115003710648
 */
export function buildFlightSearchCode(params: FlightSearchParams): string | null {
  const config = getTravelpayoutsConfig();
  const origin = (params.originIata ?? config.defaultOriginIata).toUpperCase();
  const destination =
    resolveDestinationIata(params.destination) ??
    (params.destination.length === 3 ? params.destination.toUpperCase() : null);

  const depart = formatFlightDate(params.startDate);
  const returnDate = formatFlightDate(params.endDate);

  if (!destination || !depart) return null;

  const adults = clampPassengerCount(params.adults, 1);
  if (adults < 1) return null;

  const children = clampPassengerCount(params.children, 0);
  const infants = clampPassengerCount(params.infants, 0);
  const classCode = CLASS_CODES[params.travelClass ?? 'economy'];

  const outbound = `${origin}${depart}${destination}`;
  const returnSegment = returnDate ?? '';
  const passengers =
    children === 0 && infants === 0
      ? String(adults)
      : `${adults}${children}${infants}`;

  return `${outbound}${returnSegment}${classCode}${passengers}`;
}

export type WhiteLabelUrlOptions = {
  domain: string;
  marker?: string | null;
  subId?: string;
  flightSearch?: string | null;
  extraParams?: Record<string, string>;
};

export function buildWhiteLabelUrl(options: WhiteLabelUrlOptions): string {
  const { domain, marker, subId, flightSearch, extraParams } = options;
  const base = `https://${domain.replace(/^https?:\/\//, '')}`;
  const url = new URL(base);

  if (marker && subId) {
    url.searchParams.set('marker', buildMarkerParam(marker, subId));
  }

  if (flightSearch) {
    url.searchParams.set('flightSearch', flightSearch);
  }

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function buildTripFlightSearchUrl(params: FlightSearchParams): string | null {
  const config = getTravelpayoutsConfig();
  if (!config.flightsDomain || !config.marker) return null;

  const flightSearch = buildFlightSearchCode(params);
  const subId = params.subId ?? (params.tripId ? `trip_${params.tripId}_voli` : 'voli');

  return buildWhiteLabelUrl({
    domain: config.flightsDomain,
    marker: config.marker,
    subId,
    flightSearch,
  });
}

export function buildTripHotelSearchUrl(tripId?: string): string | null {
  const config = getTravelpayoutsConfig();
  if (!config.hotelDomain || !config.marker) return null;

  const subId = tripId ? `trip_${tripId}_hotel` : 'hotel';

  return buildWhiteLabelUrl({
    domain: config.hotelDomain,
    marker: config.marker,
    subId,
  });
}