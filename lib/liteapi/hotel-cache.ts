import 'server-only';

import { redisGetJson, redisSetJson } from '@/lib/redis/upstash';
import type { LiteHotelOffer } from '@/lib/liteapi/hotels';

const CATALOG_TTL_MS = 48 * 60 * 60 * 1000; // 48h
const RATES_TTL_MS = 8 * 60 * 1000; // 8 min
const memory = new Map<string, { value: unknown; expiresAt: number }>();

export function hotelCatalogCacheKey(countryCode: string, cityName: string): string {
  return `hotels:catalog:${countryCode.toUpperCase()}:${cityName.trim().toLowerCase()}`;
}

export function hotelRatesCacheKey(params: {
  cityName: string;
  countryCode: string;
  checkin: string;
  checkout: string;
  adults: number;
  childrenAges: number[];
  currency: string;
  refundableOnly?: boolean;
}): string {
  return [
    'hotels:rates',
    params.countryCode.toUpperCase(),
    params.cityName.trim().toLowerCase(),
    params.checkin,
    params.checkout,
    params.adults,
    params.childrenAges.join('-') || '-',
    params.currency,
    params.refundableOnly ? 'rfn' : 'all',
  ].join(':');
}

async function getCached<T>(key: string): Promise<T | null> {
  const local = memory.get(key);
  if (local && Date.now() < local.expiresAt) return local.value as T;
  if (local) memory.delete(key);
  const remote = await redisGetJson<T>(key);
  if (remote == null) return null;
  memory.set(key, { value: remote, expiresAt: Date.now() + 60_000 });
  return remote;
}

async function setCached<T>(key: string, value: T, ttlMs: number): Promise<void> {
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
  await redisSetJson(key, value, ttlMs);
}

export async function getCachedHotelCatalog<T>(key: string): Promise<T | null> {
  return getCached<T>(key);
}

export async function setCachedHotelCatalog<T>(key: string, value: T): Promise<void> {
  await setCached(key, value, CATALOG_TTL_MS);
}

export async function getCachedHotelRates(
  key: string
): Promise<LiteHotelOffer[] | null> {
  return getCached<LiteHotelOffer[]>(key);
}

export async function setCachedHotelRates(
  key: string,
  offers: LiteHotelOffer[]
): Promise<void> {
  await setCached(key, offers, RATES_TTL_MS);
}
