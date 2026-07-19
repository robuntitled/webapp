import 'server-only';

import { redisGetJson, redisSetJson } from '@/lib/redis/upstash';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

function redisKey(key: string): string {
  return `ai:cache:${key}`;
}

export function getCachedValue<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  // Best-effort Redis (non blocca hot path sync)
  void redisSetJson(redisKey(key), value, ttlMs);
}

/** L1 memory → L2 Redis (condivisa tra istanze). */
export async function getCachedValueAsync<T>(key: string): Promise<T | null> {
  const local = getCachedValue<T>(key);
  if (local !== null) return local;

  const remote = await redisGetJson<T>(redisKey(key));
  if (remote === null || remote === undefined) return null;

  // Warm L1 con TTL corto (Redis ha il TTL reale)
  setCachedValueMemoryOnly(key, remote, 60_000);
  return remote;
}

export async function setCachedValueAsync<T>(
  key: string,
  value: T,
  ttlMs: number
): Promise<void> {
  setCachedValueMemoryOnly(key, value, ttlMs);
  await redisSetJson(redisKey(key), value, ttlMs);
}

function setCachedValueMemoryOnly<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearAiCacheForTests(): void {
  store.clear();
}
