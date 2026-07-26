import 'server-only';

import { liteApiFetch } from '@/lib/liteapi/client';
import { resolveDestinationIata } from '@/lib/travel/iata';
import { defaultOriginIata, resolveOriginIata } from '@/lib/travel/origin-iata';

export type LiteApiFlightOffer = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  durationMinutes: number | null;
  stops: number;
  cabinClass: string | null;
};

type UnknownRecord = Record<string, unknown>;

/** Nomi comuni da codice IATA compagnia (fallback se manca marketingName). */
const AIRLINE_NAMES: Record<string, string> = {
  AZ: 'ITA Airways',
  BA: 'British Airways',
  FR: 'Ryanair',
  U2: 'easyJet',
  LH: 'Lufthansa',
  AF: 'Air France',
  KL: 'KLM',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  TK: 'Turkish Airlines',
  IB: 'Iberia',
  VY: 'Vueling',
  W6: 'Wizz Air',
  EI: 'Aer Lingus',
  LX: 'SWISS',
  OS: 'Austrian',
  SN: 'Brussels Airlines',
  TP: 'TAP Air Portugal',
  A3: 'Aegean',
  DY: 'Norwegian',
  PC: 'Pegasus',
  LO: 'LOT',
  SU: 'Aeroflot',
  AA: 'American Airlines',
  DL: 'Delta',
  UA: 'United',
  AC: 'Air Canada',
  SQ: 'Singapore Airlines',
  CX: 'Cathay Pacific',
  QF: 'Qantas',
  EY: 'Etihad',
  HV: 'Transavia',
  TO: 'Transavia France',
  LS: 'Jet2',
  RK: 'Ryanair UK',
};

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

function toStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

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

function collectSegments(offer: UnknownRecord): UnknownRecord[] {
  const out: UnknownRecord[] = [];
  for (const key of ['segments', 'legs', 'itinerary', 'flights']) {
    for (const item of asArray(offer[key])) {
      const rec = asRecord(item);
      if (!rec) continue;
      // nested segments inside leg
      const nested = asArray(rec.segments);
      if (nested.length) {
        for (const s of nested) {
          const sr = asRecord(s);
          if (sr) out.push(sr);
        }
      } else {
        out.push(rec);
      }
    }
  }
  return out;
}

function pickTime(rec: UnknownRecord | null, keys: string[]): string | null {
  if (!rec) return null;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v) return v;
    const nested = asRecord(v);
    if (nested) {
      const dt = toStr(nested.dateTime) ?? toStr(nested.localDateTime) ?? toStr(nested.time);
      if (dt) return dt;
    }
  }
  return null;
}

function pickAirportCode(rec: UnknownRecord | null, keys: string[]): string | null {
  if (!rec) return null;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && /^[A-Za-z]{3}$/.test(v)) return v.toUpperCase();
    const nested = asRecord(v);
    if (nested) {
      const code =
        toStr(nested.iataCode) ??
        toStr(nested.iata) ??
        toStr(nested.code) ??
        toStr(nested.airportCode);
      if (code && /^[A-Za-z]{3}$/.test(code)) return code.toUpperCase();
    }
  }
  return null;
}

function extractCarrier(offer: UnknownRecord, segments: UnknownRecord[]): {
  name: string | null;
  code: string | null;
} {
  const tryCarrier = (node: UnknownRecord | null) => {
    if (!node) return { name: null as string | null, code: null as string | null };
    const name =
      toStr(node.marketingName) ??
      toStr(node.operatingName) ??
      toStr(node.name) ??
      toStr(node.airlineName);
    const code = (
      toStr(node.marketingCode) ??
      toStr(node.operatingCode) ??
      toStr(node.code) ??
      toStr(node.iata) ??
      toStr(node.airlineCode)
    )?.toUpperCase() ?? null;
    return { name, code };
  };

  const fromOffer =
    tryCarrier(asRecord(offer.marketingCarrier)) ||
    tryCarrier(asRecord(offer.validatingCarrier)) ||
    tryCarrier(asRecord(offer.carriers));

  let name =
    fromOffer.name ??
    toStr(offer.validatingAirline) ??
    toStr(offer.airline) ??
    toStr(offer.carrier);
  let code =
    fromOffer.code ??
    (typeof offer.airline === 'string' && /^[A-Z0-9]{2}$/i.test(offer.airline)
      ? offer.airline.toUpperCase()
      : null);

  if (!name || !code) {
    for (const seg of segments) {
      const c =
        tryCarrier(asRecord(seg.marketingCarrier)) ||
        tryCarrier(asRecord(seg.carrier)) ||
        tryCarrier(asRecord(seg.airline));
      if (!name && c.name) name = c.name;
      if (!code && c.code) code = c.code;
      if (name && code) break;
    }
  }

  if (code && !name) name = AIRLINE_NAMES[code] ?? code;
  if (name && /^[A-Z0-9]{2}$/.test(name) && AIRLINE_NAMES[name]) {
    code = code ?? name;
    name = AIRLINE_NAMES[name];
  }

  return { name: name ?? null, code: code ?? null };
}

function parseDurationMinutes(offer: UnknownRecord, segments: UnknownRecord[]): number | null {
  const direct =
    toNum(offer.durationMinutes) ??
    toNum(offer.totalDurationMinutes) ??
    toNum(offer.duration);
  if (direct != null) {
    // se sembra secondi
    if (direct > 24 * 60) return Math.round(direct / 60);
    return Math.round(direct);
  }

  const durStr = toStr(offer.duration) ?? toStr(offer.totalDuration);
  if (durStr) {
    const iso = durStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
    if (iso) {
      return (Number(iso[1] ?? 0) * 60) + Number(iso[2] ?? 0) || null;
    }
  }

  const dep = pickTime(segments[0] ?? null, ['departureTime', 'departure', 'departingAt']);
  const arr = pickTime(
    segments[segments.length - 1] ?? null,
    ['arrivalTime', 'arrival', 'arrivingAt']
  );
  if (dep && arr) {
    const a = Date.parse(dep);
    const b = Date.parse(arr);
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
      return Math.round((b - a) / 60000);
    }
  }
  return null;
}

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

    for (const key of ['data', 'journeys', 'offers', 'results', 'items', 'flights', 'itineraries']) {
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

  const segments = collectSegments(offer);
  const first = segments[0] ?? null;
  const last = segments[segments.length - 1] ?? null;
  const carrier = extractCarrier(offer, segments);

  const origin =
    pickAirportCode(offer, ['origin', 'originAirport']) ??
    pickAirportCode(first, ['origin', 'departure', 'departureAirport', 'from']) ??
    fallback.origin;

  const destination =
    pickAirportCode(offer, ['destination', 'destinationAirport']) ??
    pickAirportCode(last, ['destination', 'arrival', 'arrivalAirport', 'to']) ??
    fallback.destination;

  const departureAt =
    pickTime(offer, ['departureAt', 'departureTime', 'departure']) ??
    pickTime(first, ['departureTime', 'departure', 'departingAt', 'departureDateTime']);

  const arrivalAt =
    pickTime(offer, ['arrivalAt', 'arrivalTime', 'arrival']) ??
    pickTime(last, ['arrivalTime', 'arrival', 'arrivingAt', 'arrivalDateTime']);

  const stops =
    toNum(offer.stops) ??
    toNum(offer.stopCount) ??
    Math.max(0, segments.length - 1);

  return {
    offerId,
    price: priced.price,
    currency: priced.currency.toUpperCase(),
    origin,
    destination,
    airline: carrier.name,
    airlineCode: carrier.code,
    departureAt,
    arrivalAt,
    durationMinutes: parseDurationMinutes(offer, segments),
    stops: Number.isFinite(stops) ? Number(stops) : 0,
    cabinClass: toStr(offer.cabinClass) ?? toStr(offer.cabin) ?? null,
  };
}

function resolveIataOrPassThrough(destination: string): string | null {
  const trimmed = destination.trim();
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  return resolveDestinationIata(trimmed)?.toUpperCase() ?? null;
}

export async function searchFlightRates(params: {
  originIata?: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  currency?: string;
}): Promise<LiteApiFlightOffer[]> {
  const originRaw = params.originIata?.trim() || defaultOriginIata();
  const origin =
    (/^[A-Za-z]{3}$/.test(originRaw)
      ? originRaw.toUpperCase()
      : resolveOriginIata(originRaw) ?? resolveDestinationIata(originRaw)) ||
    defaultOriginIata();
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
    console.warn('[liteapi flights] 0 offerte parsate', {
      origin,
      destinationIata,
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
