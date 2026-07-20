import 'server-only';

import { getLiteApiBaseUrl, getLiteApiKey } from '@/lib/liteapi/config';

export class LiteApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'LiteApiError';
  }
}

export async function liteApiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const key = getLiteApiKey();
  if (!key) {
    throw new LiteApiError('LITEAPI_KEY non configurata', 503);
  }

  const { timeoutMs = 20_000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${getLiteApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': key,
        ...(rest.headers ?? {}),
      },
      cache: 'no-store',
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 500) };
    }

    if (!res.ok) {
      const errObj = json as { error?: { message?: string; description?: string } } | null;
      const msg =
        errObj?.error?.description ||
        errObj?.error?.message ||
        `LiteAPI ${res.status}`;
      throw new LiteApiError(msg, res.status, json);
    }

    return json as T;
  } catch (e) {
    if (e instanceof LiteApiError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new LiteApiError('Timeout LiteAPI', 504);
    }
    throw new LiteApiError(
      e instanceof Error ? e.message : 'Errore LiteAPI',
      502
    );
  } finally {
    clearTimeout(timer);
  }
}
