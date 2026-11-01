import 'server-only';

import { redisGetJson, redisSetJson } from '@/lib/redis/upstash';

const TTL_MS = 4 * 60 * 60 * 1000; // 4h
const memory = new Map<string, { value: PrebookQuote; expiresAt: number }>();

export type PrebookQuote = {
  userId: string;
  kind: 'flight' | 'hotel';
  offerId: string;
  price: number | null;
  currency: string | null;
  commissionAmount?: number | null;
  createdAt: string;
};

function key(kind: 'flight' | 'hotel', prebookId: string) {
  return `liteapi:prebook:${kind}:${prebookId}`;
}

export async function storePrebookQuote(
  kind: 'flight' | 'hotel',
  prebookId: string,
  quote: PrebookQuote
): Promise<void> {
  const k = key(kind, prebookId);
  memory.set(k, { value: quote, expiresAt: Date.now() + TTL_MS });
  await redisSetJson(k, quote, TTL_MS);
}

export async function loadPrebookQuote(
  kind: 'flight' | 'hotel',
  prebookId: string,
  userId: string
): Promise<
  | { ok: true; quote: PrebookQuote }
  | { ok: false; reason: 'missing' | 'forbidden' }
> {
  const k = key(kind, prebookId);
  const local = memory.get(k);
  let quote: PrebookQuote | null = null;
  if (local && Date.now() < local.expiresAt) {
    quote = local.value;
  } else {
    if (local) memory.delete(k);
    quote = await redisGetJson<PrebookQuote>(k);
  }
  if (!quote) return { ok: false, reason: 'missing' };
  if (quote.userId !== userId) return { ok: false, reason: 'forbidden' };
  return { ok: true, quote };
}

/** Resolve amount: book response → stored prebook → null (never client). */
export function resolveBookedAmount(input: {
  bookPrice?: number | null;
  bookCurrency?: string | null;
  quote?: PrebookQuote | null;
}): { amountEur: number | null; currency: string | null; offerId: string | null } {
  const amount =
    input.bookPrice != null && Number.isFinite(input.bookPrice)
      ? input.bookPrice
      : input.quote?.price != null && Number.isFinite(input.quote.price)
        ? input.quote.price
        : null;
  const currency =
    input.bookCurrency?.trim() ||
    input.quote?.currency?.trim() ||
    null;
  if (amount == null && !input.quote) {
    console.warn('[prebook-store] no server amount available');
  }
  return {
    amountEur: amount,
    currency,
    offerId: input.quote?.offerId ?? null,
  };
}
