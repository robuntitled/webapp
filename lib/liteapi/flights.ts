import 'server-only';

import { liteApiFetch } from '@/lib/liteapi/client';
import { resolveDestinationIata } from '@/lib/travel/iata';
import { defaultOriginIata } from '@/lib/travel/origin-iata';

export type LiteApiFlightOffer = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
};

type RawOffer = {
  offerId?: string;
  id?: string;
  price?: number | { total?: number; amount?: number; currency?: string };
  totalAmount?: number;
  currency?: string;
  validatingAirline?: string;
  airline?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  departureAt?: string;
  arrivalAt?: string;
};

type RatesResponse = {
  data?: {
    journeys?: Array<{
      offers?: RawOffer[];
      origin?: string;
      destination?: string;
    }>;
    offers?: RawOffer[];
  };
  journeys?: Array<{ offers?: RawOffer[] }>;
  offers?: RawOffer[];
};

function extractPrice(offer: RawOffer): { price: number; currency: string } | null {
  if (typeof offer.price === 'number' && offer.price > 0) {
    return { price: offer.price, currency: offer.currency ?? 'EUR' };
  }
  if (offer.price && typeof offer.price === 'object') {
    const amount = offer.price.total ?? offer.price.amount;
    if (typeof amount === 'number' && amount > 0) {
      return {
        price: amount,
        currency: offer.price.currency ?? offer.currency ?? 'EUR',
      };
    }
  }
  if (typeof offer.totalAmount === 'number' && offer.totalAmount > 0) {
    return { price: offer.totalAmount, currency: offer.currency ?? 'EUR' };
  }
  return null;
}

function flattenOffers(raw: RatesResponse): RawOffer[] {
  const out: RawOffer[] = [];
  const journeys = raw.data?.journeys ?? raw.journeys ?? [];
  for (const j of journeys) {
    for (const o of j.offers ?? []) out.push(o);
  }
  for (const o of raw.data?.offers ?? raw.offers ?? []) out.push(o);
  return out;
}

function normalizeOffer(
  offer: RawOffer,
  fallback: { origin: string; destination: string }
): LiteApiFlightOffer | null {
  const offerId = offer.offerId ?? offer.id;
  const priced = extractPrice(offer);
  if (!offerId || !priced) return null;
  return {
    offerId,
    price: priced.price,
    currency: priced.currency.toUpperCase(),
    origin: (offer.origin ?? fallback.origin).toUpperCase(),
    destination: (offer.destination ?? fallback.destination).toUpperCase(),
    airline: offer.validatingAirline ?? offer.airline ?? offer.carrier ?? null,
    departureAt: offer.departureAt ?? null,
    arrivalAt: offer.arrivalAt ?? null,
  };
}

/**
 * Ricerca tariffe volo LiteAPI (Nuitee Connect Flights).
 * POST /v3.0/flights/rates
 */
export async function searchFlightRates(params: {
  originIata?: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  currency?: string;
}): Promise<LiteApiFlightOffer[]> {
  const origin = (params.originIata?.trim() || defaultOriginIata()).toUpperCase();
  const destinationIata =
    resolveDestinationIata(params.destination)?.toUpperCase() ?? null;

  if (!destinationIata) {
    return [];
  }

  const legs: Array<{ origin: string; destination: string; date: string }> = [
    { origin, destination: destinationIata, date: params.departureDate },
  ];
  if (params.returnDate) {
    legs.push({
      origin: destinationIata,
      destination: origin,
      date: params.returnDate,
    });
  }

  const raw = await liteApiFetch<RatesResponse>('/flights/rates', {
    method: 'POST',
    body: JSON.stringify({
      legs,
      adults: params.adults ?? 1,
      currency: (params.currency ?? 'EUR').toUpperCase(),
    }),
    timeoutMs: 25_000,
  });

  const offers = flattenOffers(raw)
    .map((o) => normalizeOffer(o, { origin, destination: destinationIata }))
    .filter((o): o is LiteApiFlightOffer => o != null)
    .sort((a, b) => a.price - b.price);

  return offers;
}

export async function fetchCheapestFlightOffer(params: {
  originIata?: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  currency?: string;
}): Promise<LiteApiFlightOffer | null> {
  const offers = await searchFlightRates(params);
  return offers[0] ?? null;
}
