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

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UnknownRecord) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** Estrae prezzo da forme LiteAPI comuni (pricing.display.total, price.total, …). */
function extractPrice(offer: UnknownRecord): { price: number; currency: string } | null {
  const pricing = asRecord(offer.pricing);
  const display = asRecord(pricing?.display);
  const fromDisplay = toNum(display?.total);
  if (fromDisplay != null) {
    return {
      price: fromDisplay,
      currency: String(display?.currency ?? pricing?.currency ?? offer.currency ?? 'EUR'),
    };
  }

  const priceObj = asRecord(offer.price);
  if (priceObj) {
    const amount = toNum(priceObj.total) ?? toNum(priceObj.amount) ?? toNum(priceObj.value);
    if (amount != null) {
      return {
        price: amount,
        currency: String(priceObj.currency ?? offer.currency ?? 'EUR'),
      };
    }
  }

  const direct = toNum(offer.price) ?? toNum(offer.totalAmount) ?? toNum(offer.total);
  if (direct != null) {
    return { price: direct, currency: String(offer.currency ?? 'EUR') };
  }

  return null;
}

function extractOfferId(offer: UnknownRecord): string | null {
  const id = offer.offerId ?? offer.id ?? offer.offer_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function extractAirline(offer: UnknownRecord): string | null {
  const carriers = asRecord(offer.carriers);
  const marketing = asRecord(offer.marketingCarrier) ?? asRecord(offer.validatingCarrier);
  const raw =
    offer.validatingAirline ??
    offer.airline ??
    offer.carrier ??
    marketing?.name ??
    marketing?.code ??
    carriers?.marketingName ??
    carriers?.marketingCode;
  return typeof raw === 'string' && raw ? raw : null;
}

/** Raccoglie oggetti "offer-like" da qualsiasi forma di risposta rates. */
function collectOfferNodes(raw: unknown): UnknownRecord[] {
  const out: UnknownRecord[] = [];
  const seen = new Set<unknown>();

  const visit = (node: unknown, depth: number) => {
    if (depth > 8 || node == null) return;
    if (seen.has(node)) return;
    if (typeof node !== 'object') return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }

    const rec = node as UnknownRecord;
    if (extractOfferId(rec) && (rec.pricing != null || rec.price != null || rec.totalAmount != null)) {
      out.push(rec);
    }

    for (const key of [
      'data',
      'journeys',
      'offers',
      'results',
      'items',
      'flights',
      'itineraries',
    ]) {
      if (rec[key] != null) visit(rec[key], depth + 1);
    }
  };

  visit(raw, 0);
  return out;
}

function normalizeOffer(
  offer: UnknownRecord,
  fallback: { origin: string; destination: string }
): LiteApiFlightOffer | null {
  const offerId = extractOfferId(offer);
  const priced = extractPrice(offer);
  if (!offerId || !priced) return null;

  const legs = asArray(offer.legs);
  const firstLeg = asRecord(legs[0]);
  const lastLeg = asRecord(legs[legs.length - 1] ?? legs[0]);

  const origin = String(
    offer.origin ?? firstLeg?.origin ?? fallback.origin
  ).toUpperCase();
  const destination = String(
    offer.destination ?? lastLeg?.destination ?? fallback.destination
  ).toUpperCase();

  return {
    offerId,
    price: priced.price,
    currency: priced.currency.toUpperCase(),
    origin,
    destination,
    airline: extractAirline(offer),
    departureAt:
      typeof offer.departureAt === 'string'
        ? offer.departureAt
        : typeof firstLeg?.departureAt === 'string'
          ? firstLeg.departureAt
          : null,
    arrivalAt:
      typeof offer.arrivalAt === 'string'
        ? offer.arrivalAt
        : typeof lastLeg?.arrivalAt === 'string'
          ? lastLeg.arrivalAt
          : null,
  };
}

function resolveIataOrPassThrough(destination: string): string | null {
  const trimmed = destination.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  return resolveDestinationIata(trimmed)?.toUpperCase() ?? null;
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
  const destinationIata = resolveIataOrPassThrough(params.destination);

  if (!destinationIata) {
    console.warn('[liteapi flights] destinazione senza IATA:', params.destination);
    return [];
  }

  const legs: Array<{
    origin: string;
    destination: string;
    date: string;
    direction?: 'OUTBOUND' | 'INBOUND';
  }> = [
    {
      origin,
      destination: destinationIata,
      date: params.departureDate,
      direction: 'OUTBOUND',
    },
  ];
  if (params.returnDate && params.returnDate !== params.departureDate) {
    legs.push({
      origin: destinationIata,
      destination: origin,
      date: params.returnDate,
      direction: 'INBOUND',
    });
  }

  const body = {
    legs,
    adults: params.adults ?? 1,
    children: 0,
    infants: 0,
    currency: (params.currency ?? 'EUR').toUpperCase(),
    country: 'IT',
    cabinClass: 'ECONOMY',
  };

  const raw = await liteApiFetch<unknown>('/flights/rates', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 30_000,
  });

  const nodes = collectOfferNodes(raw);
  const offers = nodes
    .map((o) => normalizeOffer(o, { origin, destination: destinationIata }))
    .filter((o): o is LiteApiFlightOffer => o != null)
    .sort((a, b) => a.price - b.price);

  if (offers.length === 0) {
    const topKeys =
      raw && typeof raw === 'object' ? Object.keys(raw as object).slice(0, 12) : [];
    console.warn('[liteapi flights] 0 offerte parsate', {
      origin,
      destinationIata,
      topKeys,
      nodeCount: nodes.length,
    });
  }

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
