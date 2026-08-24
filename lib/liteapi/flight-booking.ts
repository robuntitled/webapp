import 'server-only';

import { liteApiFetch } from '@/lib/liteapi/client';

export type FlightContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
};

export type FlightPassengerInput = {
  title: string;
  firstName: string;
  lastName: string;
  birthday: string;
  gender: 'M' | 'F';
  nationality: string;
  documentType: string;
  documentNumber: string;
  documentIssueCountry: string;
  documentExpiry: string;
};

export type FlightVerifyResult = {
  offerId: string;
  price: number | null;
  currency: string | null;
  expiration: string | null;
  priceChanged: boolean;
  previousPrice: number | null;
  raw: unknown;
};

export type FlightPrebookResult = {
  prebookId: string;
  transactionId: string;
  secretKey: string;
  publishableKey: string | null;
  price: number | null;
  currency: string | null;
  raw: unknown;
};

export type FlightBookResult = {
  bookingId: string | null;
  bookingRef: string | null;
  status: string | null;
  raw: unknown;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UnknownRecord) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function toStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function unwrapDataItem(raw: unknown): UnknownRecord | null {
  const root = asRecord(raw);
  if (!root) return null;
  const data = root.data;
  if (Array.isArray(data)) return asRecord(data[0]);
  return asRecord(data);
}

function extractPrice(node: UnknownRecord | null): { price: number | null; currency: string | null } {
  if (!node) return { price: null, currency: null };
  const pricing = asRecord(node.pricing);
  const display = asRecord(pricing?.display);
  const price =
    toNum(display?.total) ??
    toNum(node.price) ??
    toNum(asRecord(node.price)?.total) ??
    toNum(asRecord(node.price)?.amount);
  const currency =
    toStr(display?.currency) ??
    toStr(node.currency) ??
    toStr(asRecord(node.price)?.currency);
  return { price, currency: currency?.toUpperCase() ?? null };
}

export async function verifyFlightOffer(offerId: string): Promise<FlightVerifyResult> {
  const raw = await liteApiFetch<unknown>('/flights/verify', {
    method: 'POST',
    body: JSON.stringify({ offerId }),
    timeoutMs: 35_000,
  });

  const item = unwrapDataItem(raw);
  const offer = asRecord(item?.offer) ?? item;
  const priced = extractPrice(offer) ?? extractPrice(item);
  const changes = asRecord(item?.changes) ?? asRecord(offer?.changes);
  const changePricing = asRecord(changes?.pricing);
  const oldP = extractPrice(asRecord(changePricing?.old));
  const newP = extractPrice(asRecord(changePricing?.new));
  const priceChanged = Boolean(changes && (oldP.price != null || newP.price != null));

  return {
    offerId: toStr(offer?.offerId) ?? toStr(item?.offerId) ?? offerId,
    price: newP.price ?? priced.price,
    currency: newP.currency ?? priced.currency,
    expiration: toStr(offer?.expiration) ?? toStr(item?.expiration),
    priceChanged,
    previousPrice: oldP.price,
    raw,
  };
}

export async function prebookFlight(params: {
  offerId: string;
  contact: FlightContactInput;
  passengers: FlightPassengerInput[];
}): Promise<FlightPrebookResult> {
  const raw = await liteApiFetch<unknown>('/flights/prebooks', {
    method: 'POST',
    body: JSON.stringify({
      offerId: params.offerId,
      usePaymentSdk: true,
      contact: {
        firstName: params.contact.firstName,
        lastName: params.contact.lastName,
        email: params.contact.email,
        phoneCountryCode: params.contact.phoneCountryCode.replace(/^\+/, ''),
        phoneNumber: params.contact.phoneNumber.replace(/\s+/g, ''),
      },
      passengers: params.passengers.map((p) => ({
        title: p.title.trim().toUpperCase(),
        firstName: p.firstName,
        lastName: p.lastName,
        birthday: p.birthday,
        gender: p.gender,
        nationality: p.nationality.toUpperCase(),
        documentType: p.documentType,
        documentNumber: p.documentNumber,
        documentIssueCountry: p.documentIssueCountry.toUpperCase(),
        documentExpiry: p.documentExpiry,
        passengerType: 0,
      })),
    }),
    timeoutMs: 60_000,
  });

  const item = unwrapDataItem(raw);
  if (!item) {
    throw new Error('Risposta prebook non valida');
  }

  const prebookId = toStr(item.prebookId);
  const transactionId = toStr(item.transactionId);
  const payment = asRecord(item.payment);
  const secretKey =
    toStr(item.secretKey) ??
    toStr(payment?.secretKey) ??
    toStr(payment?.clientSecret);
  if (!prebookId || !transactionId || !secretKey) {
    throw new Error('Prebook incompleto: mancano dati di pagamento');
  }

  const priced = extractPrice(item);
  const publishableKey =
    toStr(item.publishableKey) ??
    toStr(payment?.publishableKey) ??
    toStr(item.stripePublishableKey) ??
    null;

  return {
    prebookId,
    transactionId,
    secretKey,
    publishableKey,
    price: priced.price,
    currency: priced.currency,
    raw,
  };
}

function parseFlightBookPayload(raw: unknown): FlightBookResult {
  const item = unwrapDataItem(raw);
  const booking = asRecord(item?.booking) ?? item;

  return {
    bookingId:
      toStr(item?.bookingId) ??
      toStr(booking?.bookingId) ??
      toStr(booking?.id),
    bookingRef:
      toStr(item?.bookingRef) ??
      toStr(booking?.bookingRef) ??
      toStr(booking?.pnr) ??
      toStr(booking?.orderReference),
    status: toStr(item?.status) ?? toStr(booking?.status),
    raw,
  };
}

export async function bookFlight(params: {
  prebookId: string;
  transactionId: string;
}): Promise<FlightBookResult> {
  const raw = await liteApiFetch<unknown>('/flights/bookings', {
    method: 'POST',
    body: JSON.stringify({
      prebookId: params.prebookId,
      payment: {
        method: 'TRANSACTION_ID',
        transactionId: params.transactionId,
      },
    }),
    timeoutMs: 60_000,
  });

  return parseFlightBookPayload(raw);
}

export async function getFlightBooking(bookingId: string): Promise<FlightBookResult> {
  const raw = await liteApiFetch<unknown>(
    `/flights/bookings/${encodeURIComponent(bookingId)}`,
    { method: 'GET', timeoutMs: 35_000 }
  );
  return parseFlightBookPayload(raw);
}
