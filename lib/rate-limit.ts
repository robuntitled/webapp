/**
 * Rate limit:
 * - se UPSTASH_REDIS_REST_URL + TOKEN → contatore distribuito (Vercel multi-istanza)
 * - altrimenti Map in-memory (fallback per dev / senza Redis)
 */

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

/**
 * Upstash REST: INCR + EXPIRE sulla prima chiave window.
 * https://upstash.com/docs/redis/features/restapi
 */
async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<LimitResult | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!base || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;

  try {
    // Pipeline: INCR + EXPIRE se count==1 (EXPIRE NX non sempre; usiamo EXPIRE ad ogni volta se TTL -1)
    const res = await fetch(`${base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['PTTL', redisKey],
      ]),
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    let pttl = Number(data?.[1]?.result ?? -1);

    if (count === 1 || pttl < 0) {
      await fetch(`${base}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(2_000),
        cache: 'no-store',
      }).catch(() => undefined);
      pttl = windowMs;
    }

    if (count > limit) {
      return {
        ok: false,
        retryAfterMs: pttl > 0 ? pttl : windowMs,
      };
    }

    return { ok: true, retryAfterMs: 0 };
  } catch {
    return null;
  }
}

/**
 * Sync API usata ovunque: prova Upstash in fire-and-forget non è possibile sync.
 * Per non cambiare tutte le call site a async, usiamo:
 * - se Upstash non configurato → memory
 * - se configurato → memory + best-effort non bloccante non basta
 *
 * Soluzione: wrapper sync memory sempre, e `rateLimitAsync` per le route API nuove.
 * Per compat: `rateLimit` resta sync memory; le route critiche possono usare async.
 */
export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): LimitResult {
  return memoryRateLimit(key, limit, windowMs);
}

/** Preferito nelle API route: Redis se disponibile, altrimenti memory. */
export async function rateLimitAsync(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): Promise<LimitResult> {
  const remote = await upstashRateLimit(key, limit, windowMs);
  if (remote) return remote;
  return memoryRateLimit(key, limit, windowMs);
}
