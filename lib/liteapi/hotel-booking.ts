import 'server-only';

import { liteApiFetch } from '@/lib/liteapi/client';

export type HotelHolderInput = {
  firstName: string;
  lastName: string;
  email: string;
};

export type HotelGuestInput = {
  firstName: string;
  lastName: string;
  email: string;
  occupancyNumber?: number;
};

export type HotelPrebookResult = {
  prebookId: string;
  transactionId: string;
  secretKey: string;
  publishableKey: string | null;
  price: number | null;
  currency: string | null;
  raw: unknown;
};

export type HotelBookResult = {
  bookingId: string | null;
  bookingRef: string | null;
  status: string | null;
  raw: unknown;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UnknownRecord) : null;
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

function unwrapData(raw: unknown): UnknownRecord | null {
  const root = asRecord(raw);
  if (!root) return null;
  const data = root.data;
  if (Array.isArray(data)) return asRecord(data[0]);
  return asRecord(data) ?? root;
}

function extractPrice(node: UnknownRecord | null): {
  price: number | null;
  currency: string | null;
} {
  if (!node) return { price: null, currency: null };
  const pricing = asRecord(node.pricing);
  const display = asRecord(pricing?.display);
  const retail = asRecord(node.retailRate) ?? asRecord(asRecord(node.room)?.retailRate);
  const totalArr = Array.isArray(retail?.total) ? retail?.total : null;
  const firstTotal = totalArr ? asRecord(totalArr[0]) : null;
  const price =
    toNum(display?.total) ??
    toNum(node.price) ??
    toNum(asRecord(node.price)?.total) ??
    toNum(asRecord(node.price)?.amount) ??
    toNum(firstTotal?.amount) ??
    toNum(node.totalAmount);
  const currency =
    toStr(display?.currency) ??
    toStr(node.currency) ??
    toStr(asRecord(node.price)?.currency) ??
    toStr(firstTotal?.currency);
  return {
    price: price != null ? Math.round(price * 100) / 100 : null,
    currency: currency?.toUpperCase() ?? null,
  };
}

export async function prebookHotel(offerId: string): Promise<HotelPrebookResult> {
  const raw = await liteApiFetch<unknown>('/rates/prebook', {
    method: 'POST',
    body: JSON.stringify({
      offerId,
      usePaymentSdk: true,
    }),
    timeoutMs: 60_000,
  });

  const item = unwrapData(raw);
  if (!item) throw new Error('Risposta prebook hotel non valida');

  const prebookId = toStr(item.prebookId);
  const transactionId = toStr(item.transactionId);
  const secretKey = toStr(item.secretKey);
  if (!prebookId || !transactionId || !secretKey) {
    throw new Error('Prebook hotel incompleto: mancano dati di pagamento');
  }

  const priced = extractPrice(item);
  const payment = asRecord(item.payment);
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

export async function bookHotel(params: {
  prebookId: string;
  transactionId: string;
  holder: HotelHolderInput;
  guests: HotelGuestInput[];
}): Promise<HotelBookResult> {
  const raw = await liteApiFetch<unknown>('/rates/book', {
    method: 'POST',
    body: JSON.stringify({
      prebookId: params.prebookId,
      holder: {
        firstName: params.holder.firstName,
        lastName: params.holder.lastName,
        email: params.holder.email,
      },
      payment: {
        method: 'TRANSACTION_ID',
        transactionId: params.transactionId,
      },
      guests: params.guests.map((g, i) => ({
        occupancyNumber: g.occupancyNumber ?? i + 1,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
      })),
    }),
    timeoutMs: 60_000,
  });

  const item = unwrapData(raw);
  const booking = asRecord(item?.booking) ?? item;

  return {
    bookingId:
      toStr(item?.bookingId) ??
      toStr(booking?.bookingId) ??
      toStr(booking?.id),
    bookingRef:
      toStr(item?.bookingRef) ??
      toStr(booking?.bookingRef) ??
      toStr(booking?.hotelConfirmationCode) ??
      toStr(booking?.confirmationCode),
    status: toStr(item?.status) ?? toStr(booking?.status),
    raw,
  };
}
