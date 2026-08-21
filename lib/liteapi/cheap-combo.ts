import 'server-only';

import { addDays, format, parseISO } from 'date-fns';
import { buildFlightLegs, sampleStartDates, type FlightLegKind } from '@/lib/composer/flight-route';
import { searchFlightRates, type LiteApiFlightOffer } from '@/lib/liteapi/flights';
import { pickSensibleOffer, flightValueScore } from '@/lib/liteapi/flight-value';
import type { FlightLayover } from '@/lib/liteapi/flight-layovers';
import { resolveFlightDestinationIata } from '@/lib/travel/iata';
import type { DestinationMeta } from '@/types/composer';

export type CheapComboLeg = {
  id: string;
  from: string;
  to: string;
  date: string;
  kind: FlightLegKind;
  dayIndex: number;
  price: number;
  currency: string;
  stops: number;
  layovers: FlightLayover[];
  origin: string;
  destination: string;
  offerId: string;
  airline: string | null;
  airlineCode: string | null;
  airlineLogo: string | null;
  cabinClass: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  durationMinutes: number | null;
  flightNumber: string | null;
};

export type CheapComboResult = {
  startDate: string;
  endDate: string;
  maxDays: number;
  total: number;
  currency: string;
  samplesTried: number;
  legs: CheapComboLeg[];
};

function originForHop(fromLabel: string): { originIata?: string; originCountry?: string } {
  if (fromLabel.trim().toLowerCase() === 'italia') {
    return { originCountry: 'IT' };
  }
  const iata = resolveFlightDestinationIata(fromLabel);
  return iata ? { originIata: iata } : { originIata: fromLabel };
}

async function cheapestOnDate(
  from: string,
  to: string,
  date: string
): Promise<LiteApiFlightOffer | null> {
  const origin = originForHop(from);
  const dest = resolveFlightDestinationIata(to) ?? to;
  const { offers } = await searchFlightRates({
    originIata: origin.originIata,
    originCountry: origin.originCountry,
    destination: dest,
    departureDate: date,
    tripType: 'oneway',
    adults: 1,
    currency: 'EUR',
    maxOrigins: origin.originCountry === 'IT' ? 3 : 1,
  });
  return pickSensibleOffer(offers);
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function findCheapestSingleDestination(params: {
  destinations: DestinationMeta[];
  maxDays: number;
  windowStart: string;
  windowEnd: string;
}): Promise<CheapComboResult | null> {
  const dest = params.destinations[0];
  if (!dest) return null;
  const maxDays = Math.min(28, Math.max(5, Math.round(params.maxDays)));
  const starts = sampleStartDates(params.windowStart, params.windowEnd, maxDays, 5);
  if (starts.length === 0) return null;

  const destinationIata = resolveFlightDestinationIata(dest.label) ?? dest.label;

  type Sample = { start: string; end: string; offer: LiteApiFlightOffer | null };

  const samples = await mapPool(starts, 2, async (start) => {
    const end = format(addDays(parseISO(start), maxDays - 1), 'yyyy-MM-dd');
    const { offers } = await searchFlightRates({
      originCountry: 'IT',
      destination: destinationIata,
      departureDate: start,
      returnDate: end,
      tripType: 'roundtrip',
      adults: 1,
      currency: 'EUR',
      maxOrigins: 3,
    });
    return { start, end, offer: pickSensibleOffer(offers) } satisfies Sample;
  });

  const complete = samples.filter((s) => s.offer) as Array<{
    start: string;
    end: string;
    offer: LiteApiFlightOffer;
  }>;
  if (complete.length === 0) return null;

  complete.sort((a, b) => flightValueScore(a.offer) - flightValueScore(b.offer));
  const best = complete[0];
  const offer = best.offer;

  const outboundLeg: CheapComboLeg = {
    id: 'outbound',
    from: 'Italia',
    to: dest.label,
    date: best.start,
    kind: 'outbound',
    dayIndex: 1,
    price: offer.price,
    currency: offer.currency,
    stops: offer.stops,
    layovers: offer.layovers,
    origin: offer.origin,
    destination: offer.destination,
    offerId: offer.offerId,
    airline: offer.airline,
    airlineCode: offer.airlineCode,
    airlineLogo: offer.airlineLogo,
    cabinClass: offer.cabinClass,
    departureAt: offer.departureAt,
    arrivalAt: offer.arrivalAt,
    durationMinutes: offer.durationMinutes,
    flightNumber: offer.flightNumber,
  };

  const returnLeg: CheapComboLeg = {
    id: 'return',
    from: dest.label,
    to: 'Italia',
    date: best.end,
    kind: 'return',
    dayIndex: maxDays,
    price: 0,
    currency: offer.currency,
    stops: offer.stops,
    layovers: offer.layovers,
    origin: offer.destination,
    destination: offer.origin,
    offerId: offer.offerId,
    airline: offer.airline,
    airlineCode: offer.airlineCode,
    airlineLogo: offer.airlineLogo,
    cabinClass: offer.cabinClass,
    departureAt: offer.returnDepartureAt ?? null,
    arrivalAt: offer.returnArrivalAt ?? null,
    durationMinutes: offer.returnDurationMinutes ?? null,
    flightNumber: offer.returnFlightNumber ?? null,
  };

  return {
    startDate: best.start,
    endDate: best.end,
    maxDays,
    total: offer.price,
    currency: offer.currency,
    samplesTried: starts.length,
    legs: [outboundLeg, returnLeg],
  };
}

export async function findCheapestCombo(params: {
  destinations: DestinationMeta[];
  maxDays: number;
  windowStart: string;
  windowEnd: string;
}): Promise<CheapComboResult | null> {
  if (params.destinations.length === 1) {
    return findCheapestSingleDestination(params);
  }
  const maxDays = Math.min(28, Math.max(5, Math.round(params.maxDays)));
  const starts = sampleStartDates(params.windowStart, params.windowEnd, maxDays, 4);
  if (starts.length === 0 || params.destinations.length < 2) return null;

  type Sample = { start: string; end: string; quotes: Array<CheapComboLeg | null> };

  const samples = await mapPool(starts, 2, async (start) => {
    const end = format(addDays(parseISO(start), maxDays - 1), 'yyyy-MM-dd');
    const legs = buildFlightLegs(params.destinations, start, end);
    const quotes = await mapPool(legs, 3, async (leg) => {
      const offer = await cheapestOnDate(leg.from, leg.to, leg.date);
      if (!offer) return null;
      return {
        id: leg.id,
        from: leg.from,
        to: leg.to,
        date: leg.date,
        kind: leg.kind,
        dayIndex: leg.dayIndex,
        price: offer.price,
        currency: offer.currency,
        stops: offer.stops,
        layovers: offer.layovers,
        origin: offer.origin,
        destination: offer.destination,
        offerId: offer.offerId,
        airline: offer.airline,
        airlineCode: offer.airlineCode,
        airlineLogo: offer.airlineLogo,
        cabinClass: offer.cabinClass,
        departureAt: offer.departureAt,
        arrivalAt: offer.arrivalAt,
        durationMinutes: offer.durationMinutes,
        flightNumber: offer.flightNumber,
      } satisfies CheapComboLeg;
    });
    return { start, end, quotes } satisfies Sample;
  });

  const complete = samples.filter((s) => s.quotes.every(Boolean)) as Array<{
    start: string;
    end: string;
    quotes: CheapComboLeg[];
  }>;
  if (complete.length === 0) return null;

  complete.sort(
    (a, b) =>
      a.quotes.reduce((sum, l) => sum + flightValueScore(l), 0) -
      b.quotes.reduce((sum, l) => sum + flightValueScore(l), 0)
  );
  const best = complete[0];
  const total = Math.round(best.quotes.reduce((sum, l) => sum + l.price, 0) * 100) / 100;

  return {
    startDate: best.start,
    endDate: best.end,
    maxDays,
    total,
    currency: best.quotes[0]?.currency ?? 'EUR',
    samplesTried: starts.length,
    legs: best.quotes,
  };
}
