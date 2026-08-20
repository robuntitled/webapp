import 'server-only';

import { redisGetJson, redisSetJson } from '@/lib/redis/upstash';
import type { LiteApiFlightOffer } from '@/lib/liteapi/flights';

const HIT_TTL_MS = 12 * 60 * 1000;
const MISS_TTL_MS = 90 * 1000;

type Entry = { offers: LiteApiFlightOffer[]; expiresAt: number };

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<LiteApiFlightOffer[]>>();

function redisKey(key: string): string {
  return `flights:rates:${key}`;
}

export function flightRatesCacheKey(params: {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  currency: string;
}): string {
  return [
    params.originIata,
    params.destinationIata,
    params.departureDate,
    params.returnDate || '-',
    params.adults,
    params.currency,
  ].join(':');
}

export async function getCachedFlightRates(
  key: string
): Promise<LiteApiFlightOffer[] | null> {
  const local = memory.get(key);
  if (local && Date.now() < local.expiresAt) return local.offers;
  if (local) memory.delete(key);

  const remote = await redisGetJson<LiteApiFlightOffer[]>(redisKey(key));
  if (!remote) return null;
  memory.set(key, { offers: remote, expiresAt: Date.now() + 60_000 });
  return remote;
}

export async function setCachedFlightRates(
  key: string,
  offers: LiteApiFlightOffer[]
): Promise<void> {
  const ttl = offers.length ? HIT_TTL_MS : MISS_TTL_MS;
  memory.set(key, { offers, expiresAt: Date.now() + ttl });
  await redisSetJson(redisKey(key), offers, ttl);
}

export async function withFlightRatesInflight(
  key: string,
  load: () => Promise<LiteApiFlightOffer[]>
): Promise<LiteApiFlightOffer[]> {
  const pending = inflight.get(key);
  if (pending) return pending;
  const run = load().finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}
