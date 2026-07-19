/**
 * Rate limit:
 * - Upstash Redis se configurato (Vercel multi-istanza)
 * - altrimenti Map in-memory (dev / fallback)
 */

import {
  isProductionRuntime,
  isUpstashConfigured,
  redisIncrWithWindow,
} from '@/lib/redis/upstash';
import { requireUpstashInProduction } from '@/lib/flags';

type LimitResult = { ok: boolean; retryAfterMs: number };

const hits = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): LimitResult {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<LimitResult | null> {
  const result = await redisIncrWithWindow(`rl:${key}`, windowMs);
  if (!result) return null;

  if (result.count > limit) {
    return {
      ok: false,
      retryAfterMs: result.pttl > 0 ? result.pttl : windowMs,
    };
  }

  return { ok: true, retryAfterMs: 0 };
}

let warnedMissingUpstash = false;

function warnMissingUpstashOnce(): void {
  if (warnedMissingUpstash) return;
  if (!isProductionRuntime() || !requireUpstashInProduction()) return;
  if (isUpstashConfigured()) return;
  warnedMissingUpstash = true;
  console.error(
    '[rate-limit] UPSTASH_REDIS non configurato in produzione — limiti per-istanza (non globali)'
  );
}

/**
 * @deprecated Preferisci `rateLimitAsync` (Redis). Sync = solo memory.
 */
export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): LimitResult {
  return memoryRateLimit(key, limit, windowMs);
}

/** Preferito: Redis se disponibile, altrimenti memory. */
export async function rateLimitAsync(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): Promise<LimitResult> {
  const remote = await upstashRateLimit(key, limit, windowMs);
  if (remote) return remote;
  warnMissingUpstashOnce();
  return memoryRateLimit(key, limit, windowMs);
}

/** Solo test — svuota contatori memory. */
export function clearRateLimitMemoryForTests(): void {
  hits.clear();
}
