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

const SANDBOX_BASE = 'https://api.sandbox.viator.com/partner';
const LIVE_BASE = 'https://api.viator.com/partner';

function parseErrorDetail(json: unknown, status: number): string {
  const errObj = json as {
    message?: string;
    errorMessage?: string;
    raw?: string;
    errors?: Array<{ message?: string; errorMessage?: string }>;
  } | null;
  return (
    errObj?.message ||
    errObj?.errorMessage ||
    errObj?.errors?.[0]?.message ||
    errObj?.errors?.[0]?.errorMessage ||
    errObj?.raw ||
    `Viator HTTP ${status}`
  );
}

async function viatorFetchOnce<T>(
  baseUrl: string,
  path: string,
  key: string,
  init: RequestInit & { timeoutMs?: number }
): Promise<{ ok: true; data: T } | { ok: false; status: number; detail: string; body: unknown }> {
  const { timeoutMs = 20_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const campaign = getViatorCampaign();
    // target-lander=NONE → productUrl/attractionUrl aprono il PDP reale, non il
    // lander affiliate generico (lista destinazione + prodotti correlati).
    const extras = [
      campaign
        ? `campaign-value=${encodeURIComponent(campaign)}`
        : null,
      'target-lander=NONE',
    ].filter(Boolean);
    const qs = extras.length
      ? `${path.includes('?') ? '&' : '?'}${extras.join('&')}`
      : '';
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}${qs}`;

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
      return {
        ok: false,
        status: res.status,
        detail: parseErrorDetail(json, res.status),
        body: json,
      };
    }

    return { ok: true, data: json as T };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, status: 504, detail: 'Timeout Viator', body: null };
    }
    return {
      ok: false,
      status: 502,
      detail: e instanceof Error ? e.message : 'Errore Viator',
      body: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Chiama Viator. Se la key fallisce su live (tipico: account nuovo = solo sandbox),
 * riprova automaticamente su api.sandbox.viator.com.
 */
export async function viatorFetch<T = unknown>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const key = getViatorApiKey();
  if (!key) {
    throw new ViatorError('VIATOR_API_KEY non configurata', 503);
  }

  const configured = getViatorBaseUrl();
  const primary = configured;
  const canFallback =
    !configured.includes('sandbox') &&
    (configured === LIVE_BASE || !process.env.VIATOR_BASE_URL);

  const first = await viatorFetchOnce<T>(primary, path, key, init ?? {});
  if (first.ok) return first.data;

  const invalidKey = /invalid api key/i.test(first.detail);
  if (canFallback && invalidKey) {
    console.warn('[viator] Invalid API Key su live → retry sandbox', path);
    const second = await viatorFetchOnce<T>(SANDBOX_BASE, path, key, init ?? {});
    if (second.ok) return second.data;
    console.error('[viator]', second.status, path, second.detail, '(sandbox)');
    throw new ViatorError(
      `${second.detail} (provato live + sandbox). Controlla che VIATOR_API_KEY sia la chiave Affiliate API completa, senza spazi/virgolette, e che l’account sia verificato.`,
      second.status,
      second.body
    );
  }

  console.error('[viator]', first.status, path, first.detail);
  throw new ViatorError(first.detail, first.status, first.body);
}
