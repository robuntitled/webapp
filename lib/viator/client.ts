import 'server-only';

import {
  getViatorAcceptLanguage,
  getViatorApiKey,
  getViatorBaseUrl,
  getViatorCampaign,
} from '@/lib/viator/config';

export class ViatorError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ViatorError';
  }
}

export async function viatorFetch<T = unknown>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const key = getViatorApiKey();
  if (!key) {
    throw new ViatorError('VIATOR_API_KEY non configurata', 503);
  }

  const { timeoutMs = 20_000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const campaign = getViatorCampaign();
    const qs = campaign
      ? `${path.includes('?') ? '&' : '?'}campaign-value=${encodeURIComponent(campaign)}`
      : '';
    const url = `${getViatorBaseUrl()}${path.startsWith('/') ? path : `/${path}`}${qs}`;

    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json;version=2.0',
        'Content-Type': 'application/json',
        'Accept-Language': getViatorAcceptLanguage(),
        'exp-api-key': key,
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
      const errObj = json as {
        message?: string;
        errorMessage?: string;
        code?: string;
        raw?: string;
        errors?: Array<{ message?: string; errorMessage?: string }>;
      } | null;
      const detail =
        errObj?.message ||
        errObj?.errorMessage ||
        errObj?.errors?.[0]?.message ||
        errObj?.errors?.[0]?.errorMessage ||
        errObj?.raw ||
        `Viator HTTP ${res.status}`;
      console.error('[viator]', res.status, path, detail);
      throw new ViatorError(detail, res.status, json);
    }

    return json as T;
  } catch (e) {
    if (e instanceof ViatorError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ViatorError('Timeout Viator', 504);
    }
    console.error('[viator]', path, e);
    throw new ViatorError(e instanceof Error ? e.message : 'Errore Viator', 502);
  } finally {
    clearTimeout(timer);
  }
}
