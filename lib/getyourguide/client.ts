import 'server-only';

import { getGygAccessToken, getGygBaseUrl } from '@/lib/getyourguide/config';

export class GygError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'GygError';
  }
}

export async function gygFetch<T = unknown>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const token = getGygAccessToken();
  if (!token) {
    throw new GygError('GETYOURGUIDE_ACCESS_TOKEN non configurata', 503);
  }

  const { timeoutMs = 20_000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${getGygBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'X-ACCESS-TOKEN': token,
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
      const errObj = json as { message?: string; error?: string } | null;
      throw new GygError(
        errObj?.message || errObj?.error || `GetYourGuide ${res.status}`,
        res.status,
        json
      );
    }

    return json as T;
  } catch (e) {
    if (e instanceof GygError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new GygError('Timeout GetYourGuide', 504);
    }
    throw new GygError(e instanceof Error ? e.message : 'Errore GetYourGuide', 502);
  } finally {
    clearTimeout(timer);
  }
}
