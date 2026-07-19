import 'server-only';

/**
 * Client minimo Upstash REST (senza SDK).
 * Usato per rate-limit, AI cache, budget e cooldown quota su Vercel multi-istanza.
 */

export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

/** In produzione Vercel Redis è fortemente consigliato. */
export function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.NODE_ENV === 'production'
  );
}

function credentials(): { base: string; token: string } | null {
  const base = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

async function redisFetch(
  path: string,
  init?: RequestInit
): Promise<Response | null> {
  const creds = credentials();
  if (!creds) return null;
  try {
    return await fetch(`${creds.base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${creds.token}`,
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
  } catch {
    return null;
  }
}

export async function redisGet(key: string): Promise<string | null> {
  const res = await redisFetch(`/get/${encodeURIComponent(key)}`);
  if (!res?.ok) return null;
  const data = (await res.json()) as { result?: string | null };
  return typeof data.result === 'string' ? data.result : null;
}

export async function redisSet(
  key: string,
  value: string,
  ttlMs?: number
): Promise<boolean> {
  const creds = credentials();
  if (!creds) return false;

  const body =
    ttlMs && ttlMs > 0
      ? ['SET', key, value, 'PX', String(Math.max(1, Math.floor(ttlMs)))]
      : ['SET', key, value];

  try {
    const res = await fetch(`${creds.base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([body]),
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await redisGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSetJson(
  key: string,
  value: unknown,
  ttlMs?: number
): Promise<boolean> {
  try {
    return await redisSet(key, JSON.stringify(value), ttlMs);
  } catch {
    return false;
  }
}

export type RedisIncrResult = { count: number; pttl: number };

/** INCR + assicura TTL finestra (ms). */
export async function redisIncrWithWindow(
  key: string,
  windowMs: number
): Promise<RedisIncrResult | null> {
  const creds = credentials();
  if (!creds) return null;

  try {
    const res = await fetch(`${creds.base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PTTL', key],
      ]),
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    let pttl = Number(data?.[1]?.result ?? -1);

    if (count === 1 || pttl < 0) {
      await fetch(
        `${creds.base}/pexpire/${encodeURIComponent(key)}/${Math.max(1, Math.floor(windowMs))}`,
        {
          headers: { Authorization: `Bearer ${creds.token}` },
          signal: AbortSignal.timeout(2_000),
          cache: 'no-store',
        }
      ).catch(() => undefined);
      pttl = windowMs;
    }

    return { count, pttl: pttl > 0 ? pttl : windowMs };
  } catch {
    return null;
  }
}

/** INCRBYFLOAT per budget (dollari). TTL ~ fine mese + buffer. */
export async function redisIncrByFloat(
  key: string,
  delta: number,
  ttlMs: number
): Promise<number | null> {
  const creds = credentials();
  if (!creds) return null;

  try {
    const res = await fetch(`${creds.base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCRBYFLOAT', key, String(delta)],
        ['PTTL', key],
      ]),
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ result?: string | number }>;
    const value = Number(data?.[0]?.result ?? 0);
    const pttl = Number(data?.[1]?.result ?? -1);

    if (pttl < 0) {
      await fetch(
        `${creds.base}/pexpire/${encodeURIComponent(key)}/${Math.max(1, Math.floor(ttlMs))}`,
        {
          headers: { Authorization: `Bearer ${creds.token}` },
          signal: AbortSignal.timeout(2_000),
          cache: 'no-store',
        }
      ).catch(() => undefined);
    }

    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
