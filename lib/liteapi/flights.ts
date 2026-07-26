import 'server-only';

import { liteApiFetch } from '@/lib/liteapi/client';
import { resolveDestinationIata } from '@/lib/travel/iata';
import { defaultOriginIata, resolveOriginIata } from '@/lib/travel/origin-iata';
import { airportsForCountry, resolveOriginAirports } from '@/lib/travel/airports-by-country';

export type LiteApiFlightOffer = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode: string | null;
  airlineLogo: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  durationMinutes: number | null;
  stops: number;
  cabinClass: string | null;
  flightNumber: string | null;
};

type UnknownRecord = Record<string, unknown>;

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
  EN: 'Air Dolomiti',
  XW: 'NokScoot',
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
  const fromDisplay = toNum(display?.total) ?? toNum(display?.amount);
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

function looksLikeSegment(rec: UnknownRecord): boolean {
  return (
    rec.departureTime != null ||
    rec.arrivalTime != null ||
    rec.originCode != null ||
    rec.destinationCode != null ||
    rec.departure != null ||
    rec.origin != null ||
    rec.departureAirport != null ||
    rec.carrier != null ||
    rec.flight != null ||
    rec.flightNumber != null
  );
}

/** Segmenti: preferisci quelli del journey (parent), poi dell'offer. */
function collectSegments(...nodes: Array<UnknownRecord | null>): UnknownRecord[] {
  const out: UnknownRecord[] = [];
  for (const node of nodes) {
    if (!node) continue;
    for (const key of ['segments', 'legs', 'flights', 'itinerary']) {
      for (const item of asArray(node[key])) {
        const rec = asRecord(item);
        if (!rec) continue;
        const nested = asArray(rec.segments);
        if (nested.length) {
          for (const s of nested) {
            const sr = asRecord(s);
            if (sr) out.push(sr);
          }
        } else if (looksLikeSegment(rec)) {
          out.push(rec);
        }
      }
    }
    if (out.length) break;
  }
  return out;
}

function pickTime(rec: UnknownRecord | null): string | null {
  if (!rec) return null;
  for (const k of [
    'departureTime',
    'arrivalTime',
    'departureDateTime',
    'arrivalDateTime',
    'departingAt',
    'arrivingAt',
    'departure',
    'arrival',
  ]) {
    const v = rec[k];
    if (typeof v === 'string' && v) {
      // se è solo data senza ora, skip per time display later
      return v;
    }
    const nested = asRecord(v);
    if (nested) {
      const dt =
        toStr(nested.dateTime) ??
        toStr(nested.localDateTime) ??
        toStr(nested.at) ??
        toStr(nested.time);
      if (dt) {
        const dateOnly = toStr(nested.date);
        if (dateOnly && /^\d{2}:\d{2}/.test(dt) === false && dt.length <= 10) {
          return `${dateOnly}T${toStr(nested.time) ?? '00:00:00'}`;
        }
        if (dateOnly && toStr(nested.time)) return `${dateOnly}T${toStr(nested.time)}`;
        return dt;
      }
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
        toStr(nested.airportCode) ??
        toStr(nested.airport);
      if (code && /^[A-Za-z]{3}$/.test(code)) return code.toUpperCase();
    }
  }
  return null;
}

function segmentAirport(
  seg: UnknownRecord | null,
  side: 'origin' | 'destination'
): string | null {
  if (!seg) return null;
  if (side === 'origin') {
    return (
      pickAirportCode(seg, [
        'originCode',
        'origin',
        'departure',
        'departureAirport',
        'departureAirportCode',
        'from',
      ]) ?? null
    );
  }
  return (
    pickAirportCode(seg, [
      'destinationCode',
      'destination',
      'arrival',
      'arrivalAirport',
      'arrivalAirportCode',
      'to',
    ]) ?? null
  );
}

function segmentDateTime(seg: UnknownRecord | null, side: 'departure' | 'arrival'): string | null {
  if (!seg) return null;
  const keys =
    side === 'departure'
      ? ['departureTime', 'departureDateTime', 'departingAt', 'departure']
      : ['arrivalTime', 'arrivalDateTime', 'arrivingAt', 'arrival'];
  for (const k of keys) {
    const v = seg[k];
    if (typeof v === 'string' && v.length > 5) return v;
    const nested = asRecord(v);
    if (nested) {
      const dt = toStr(nested.dateTime) ?? toStr(nested.localDateTime);
      if (dt) return dt;
      const date = toStr(nested.date);
      const time = toStr(nested.time) ?? toStr(nested.localTime);
      if (date && time) return `${date}T${time.length === 5 ? `${time}:00` : time}`;
    }
  }
  return null;
}

function extractCarrier(
  offer: UnknownRecord,
  journey: UnknownRecord | null,
  segments: UnknownRecord[]
): { name: string | null; code: string | null; logo: string | null } {
  const tryCarrier = (node: UnknownRecord | null) => {
    if (!node) {
      return {
        name: null as string | null,
        code: null as string | null,
        logo: null as string | null,
      };
    }
    const name =
      toStr(node.marketingName) ??
      toStr(node.operatingName) ??
      toStr(node.name) ??
      toStr(node.airlineName) ??
      toStr(node.carrierName);
    const code =
      (
        toStr(node.marketingCode) ??
        toStr(node.operatingCode) ??
        toStr(node.code) ??
        toStr(node.iata) ??
        toStr(node.airlineCode) ??
        toStr(node.carrierCode)
      )?.toUpperCase() ?? null;
    const logo =
      toStr(node.marketingLogo) ??
      toStr(node.operatingLogo) ??
      toStr(node.logo) ??
      toStr(node.logoUrl);
    return { name, code, logo };
  };

  let name: string | null = null;
  let code: string | null = null;
  let logo: string | null = null;

  for (const node of [
    ...segments.map((s) => asRecord(s.carrier)),
    ...segments.map((s) => asRecord(s.marketingCarrier)),
    ...segments.map((s) => asRecord(s.operatingCarrier)),
    ...segments.map((s) => asRecord(s.airline)),
    asRecord(offer.marketingCarrier),
    asRecord(offer.validatingCarrier),
    asRecord(offer.carriers),
    asRecord(journey?.marketingCarrier),
    asRecord(journey?.validatingCarrier),
  ]) {
    const c = tryCarrier(node);
    if (!name && c.name) name = c.name;
    if (!code && c.code) code = c.code;
    if (!logo && c.logo) logo = c.logo;
    if (name && code) break;
  }

  name =
    name ??
    toStr(offer.validatingAirline) ??
    toStr(offer.airline) ??
    toStr(offer.carrier) ??
    toStr(journey?.airline);

  if (!code && typeof offer.airline === 'string' && /^[A-Z0-9]{2}$/i.test(offer.airline)) {
    code = offer.airline.toUpperCase();
  }

  if (!code) {
    for (const seg of segments) {
      const fn = toStr(seg.flightNumber) ?? toStr(seg.marketingFlightNumber);
      const m = fn?.match(/^([A-Z0-9]{2})\s*\d/i);
      if (m) {
        code = m[1].toUpperCase();
        break;
      }
    }
  }

  if (code && !name) name = AIRLINE_NAMES[code] ?? null;
  if (name && /^[A-Z0-9]{2}$/i.test(name)) {
    code = code ?? name.toUpperCase();
    name = AIRLINE_NAMES[code] ?? name;
  }

  return { name, code, logo };
}

function durationFromUnknown(v: unknown): number | null {
  if (v == null) return null;
  const n = toNum(v);
  if (n != null) return n > 24 * 60 ? Math.round(n / 60) : Math.round(n);
  const rec = asRecord(v);
  if (rec) {
    const mins = toNum(rec.minutes) ?? toNum(rec.durationMinutes);
    if (mins != null) return Math.round(mins);
    const iso = toStr(rec.iso8601) ?? toStr(rec.duration);
    if (iso) {
      const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
      if (m) return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) || null;
    }
  }
  const durStr = toStr(v);
  if (durStr) {
    const iso = durStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
    if (iso) return Number(iso[1] ?? 0) * 60 + Number(iso[2] ?? 0) || null;
  }
  return null;
}

function parseDurationMinutes(
  offer: UnknownRecord,
  journey: UnknownRecord | null,
  segments: UnknownRecord[],
  dep: string | null,
  arr: string | null
): number | null {
  const fromJourney =
    durationFromUnknown(journey?.totalDuration) ??
    durationFromUnknown(journey?.duration) ??
    durationFromUnknown(offer.totalDuration) ??
    durationFromUnknown(offer.duration);

  if (fromJourney != null) return fromJourney;

  // Solo andata: somma durate segmenti OUTBOUND (o tutti se manca direction)
  let sum = 0;
  let counted = 0;
  for (const seg of segments) {
    const dir = toStr(seg.direction)?.toUpperCase();
    if (dir && dir !== 'OUTBOUND') continue;
    const mins = durationFromUnknown(seg.duration);
    if (mins != null) {
      sum += mins;
      counted += 1;
    }
  }
  if (counted > 0) return sum;

  if (dep && arr) {
    const a = Date.parse(dep);
    const b = Date.parse(arr);
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
      return Math.round((b - a) / 60000);
    }
  }
  return null;
}

/** LiteAPI: `data` è un array di batch provider, ciascuno con `journeys[]`. */
function getJourneys(raw: unknown): UnknownRecord[] {
  const root = asRecord(raw);
  if (!root) return [];

  const out: UnknownRecord[] = [];
  const pushFrom = (node: UnknownRecord | null) => {
    if (!node) return;
    for (const j of asArray(node.journeys)) {
      const rec = asRecord(j);
      if (rec) out.push(rec);
    }
  };

  pushFrom(root);
  const data = root.data;
  if (Array.isArray(data)) {
    for (const batch of data) pushFrom(asRecord(batch));
  } else {
    pushFrom(asRecord(data));
  }

  return out;
}

type OfferContext = {
  offer: UnknownRecord;
  journey: UnknownRecord | null;
};

function collectOfferContexts(raw: unknown): OfferContext[] {
  const out: OfferContext[] = [];
  const journeys = getJourneys(raw);

  for (const journey of journeys) {
    const offers = asArray(journey.offers);
    if (offers.length) {
      for (const o of offers) {
        const offer = asRecord(o);
        if (offer && extractOfferId(offer)) out.push({ offer, journey });
      }
    } else if (extractOfferId(journey) && (journey.pricing != null || journey.price != null)) {
      // journey stesso è un'offerta
      out.push({ offer: journey, journey });
    }
  }

  // fallback: offerte piatte senza journey
  if (out.length === 0) {
    const root = asRecord(raw);
    const data = asRecord(root?.data) ?? root;
    for (const o of asArray(data?.offers ?? root?.offers)) {
      const offer = asRecord(o);
      if (offer && extractOfferId(offer)) out.push({ offer, journey: null });
    }
  }

  return out;
}

function normalizeOfferContext(
  ctx: OfferContext,
  fallback: { origin: string; destination: string }
): LiteApiFlightOffer | null {
  const { offer, journey } = ctx;
  const offerId = extractOfferId(offer);
  const priced = extractPrice(offer) ?? (journey ? extractPrice(journey) : null);
  if (!offerId || !priced) return null;

  const segments = collectSegments(journey, offer);
  const outbound = segments.filter((s) => {
    const dir = toStr(s.direction)?.toUpperCase();
    return !dir || dir === 'OUTBOUND';
  });
  const leg = outbound.length ? outbound : segments;
  const first = leg[0] ?? null;
  const last = leg[leg.length - 1] ?? null;
  const carrier = extractCarrier(offer, journey, leg.length ? leg : segments);

  const origin =
    segmentAirport(first, 'origin') ??
    pickAirportCode(journey, ['origin', 'originAirport', 'originCode', 'from']) ??
    pickAirportCode(offer, ['origin', 'originAirport', 'originCode']) ??
    fallback.origin;

  const destination =
    segmentAirport(last, 'destination') ??
    pickAirportCode(journey, ['destination', 'destinationAirport', 'destinationCode', 'to']) ??
    pickAirportCode(offer, ['destination', 'destinationAirport', 'destinationCode']) ??
    fallback.destination;

  const departureAt =
    segmentDateTime(first, 'departure') ??
    pickTime(offer) ??
    (journey ? pickTime(journey) : null);
  const arrivalAt = segmentDateTime(last, 'arrival');

  const flightObj = asRecord(first?.flight);
  const flightNumber =
    (carrier.code && toStr(flightObj?.marketingNumber)
      ? `${carrier.code}${toStr(flightObj?.marketingNumber)}`
      : null) ??
    toStr(first?.flightNumber) ??
    toStr(first?.marketingFlightNumber) ??
    toStr(offer.flightNumber) ??
    null;

  const connections = asArray(journey?.connections);
  const stops =
    toNum(offer.stops) ??
    toNum(journey?.stops) ??
    toNum(journey?.stopCount) ??
    (connections.length
      ? connections.filter((c) => {
          const rec = asRecord(c);
          const dir = toStr(rec?.direction)?.toUpperCase();
          return !dir || dir === 'OUTBOUND';
        }).length
      : Math.max(0, leg.length - 1));

  const fare = asRecord(offer.fare);

  return {
    offerId,
    price: priced.price,
    currency: priced.currency.toUpperCase(),
    origin,
    destination,
    airline: carrier.name,
    airlineCode: carrier.code,
    airlineLogo: carrier.logo,
    departureAt,
    arrivalAt,
    durationMinutes: parseDurationMinutes(offer, journey, leg, departureAt, arrivalAt),
    stops: Number.isFinite(stops as number) ? Number(stops) : 0,
    cabinClass:
      toStr(fare?.family) ??
      toStr(offer.cabinClass) ??
      toStr(offer.cabin) ??
      toStr(journey?.cabinClass) ??
      null,
    flightNumber,
  };
}

function resolveIataFlexible(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();
  return (
    resolveDestinationIata(trimmed)?.toUpperCase() ??
    resolveOriginIata(trimmed)?.toUpperCase() ??
    null
  );
}

async function searchOneOrigin(params: {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  currency: string;
}): Promise<LiteApiFlightOffer[]> {
  const legs: Array<{
    origin: string;
    destination: string;
    date: string;
    direction?: 'OUTBOUND' | 'INBOUND';
  }> = [
    {
      origin: params.originIata,
      destination: params.destinationIata,
      date: params.departureDate,
      direction: 'OUTBOUND',
    },
  ];
  if (params.returnDate) {
    legs.push({
      origin: params.destinationIata,
      destination: params.originIata,
      date: params.returnDate,
      direction: 'INBOUND',
    });
  }

  const raw = await liteApiFetch<unknown>('/flights/rates', {
    method: 'POST',
    body: JSON.stringify({
      legs,
      adults: params.adults,
      children: 0,
      infants: 0,
      currency: params.currency,
      country: 'IT',
      cabinClass: 'ECONOMY',
    }),
    timeoutMs: 30_000,
  });

  const contexts = collectOfferContexts(raw);
  return contexts
    .map((ctx) =>
      normalizeOfferContext(ctx, {
        origin: params.originIata,
        destination: params.destinationIata,
      })
    )
    .filter((o): o is LiteApiFlightOffer => o != null);
}

export async function searchFlightRates(params: {
  originIata?: string;
  /** Paese ISO2 o nome (es. IT / Italia) → ricerca multi-aeroporto */
  originCountry?: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  tripType?: 'oneway' | 'roundtrip';
  adults?: number;
  currency?: string;
}): Promise<{ offers: LiteApiFlightOffer[]; destinationIata: string; originsSearched: string[] }> {
  const destinationIata = resolveIataFlexible(params.destination);
  if (!destinationIata) {
    return { offers: [], destinationIata: '', originsSearched: [] };
  }

  const origins = params.originCountry
    ? airportsForCountry(params.originCountry)
    : resolveOriginAirports(params.originIata || defaultOriginIata(), (label) =>
        resolveOriginIata(label) ?? resolveDestinationIata(label)
      );

  if (!origins.length) {
    return { offers: [], destinationIata, originsSearched: [] };
  }

  const returnDate =
    params.tripType === 'oneway'
      ? null
      : params.returnDate && params.returnDate !== params.departureDate
        ? params.returnDate
        : null;

  const adults = params.adults ?? 1;
  const currency = (params.currency ?? 'EUR').toUpperCase();

  // Max 5 aeroporti in parallelo per non saturare rate limit
  const batch = origins.slice(0, 5);
  const results = await Promise.allSettled(
    batch.map((originIata) =>
      searchOneOrigin({
        originIata,
        destinationIata,
        departureDate: params.departureDate,
        returnDate,
        adults,
        currency,
      })
    )
  );

  const offers: LiteApiFlightOffer[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') offers.push(...r.value);
    else console.warn('[flights] origin search failed', r.reason);
  }

  offers.sort((a, b) => a.price - b.price);

  // Dedup per offerId
  const seen = new Set<string>();
  const unique = offers.filter((o) => {
    if (seen.has(o.offerId)) return false;
    seen.add(o.offerId);
    return true;
  });

  return { offers: unique, destinationIata, originsSearched: batch };
}

export async function fetchCheapestFlightOffer(params: {
  originIata?: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  currency?: string;
}): Promise<LiteApiFlightOffer | null> {
  const { offers } = await searchFlightRates({
    ...params,
    tripType: params.returnDate ? 'roundtrip' : 'oneway',
  });
  return offers[0] ?? null;
}
