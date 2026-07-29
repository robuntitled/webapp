import 'server-only';

export class GetTransferError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'GetTransferError';
  }
}

export function getGetTransferAccessToken(): string | null {
  return process.env.GETTRANSFER_ACCESS_TOKEN?.trim() || null;
}

export function isGetTransferApiConfigured(): boolean {
  return Boolean(getGetTransferAccessToken());
}

/** Base URL for GetTransfer API (server-only). */
export function getGetTransferApiBaseUrl(): string {
  const override = process.env.GETTRANSFER_API_BASE?.trim();
  if (override) return override.replace(/\/$/, '');

  const env = process.env.GETTRANSFER_ENV?.trim().toLowerCase();
  if (env === 'sandbox' || env === 'test') {
    return 'https://gtrbox.org/api';
  }
  return 'https://gettransfer.com/api';
}

export type RouteInfoParams = {
  points: Array<{ lat: number; lng: number }>;
  pax: number;
  dateTo: string;
  currency?: string;
  distanceUnit?: 'km' | 'm';
};

/** Builds query string for GET /route_info (exported for tests). */
export function buildRouteInfoQuery(params: RouteInfoParams): string {
  const sp = new URLSearchParams();
  for (const p of params.points) {
    sp.append('points[]', `${p.lat},${p.lng}`);
  }
  sp.set('with_prices', 'true');
  sp.set('pax', String(Math.max(1, params.pax)));
  sp.set('date_to', params.dateTo);
  sp.set('currency', params.currency ?? 'EUR');
  sp.set('distance_unit', params.distanceUnit ?? 'km');
  return sp.toString();
}

export function buildRouteInfoUrl(
  baseUrl: string,
  params: RouteInfoParams
): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/route_info?${buildRouteInfoQuery(params)}`;
}

export async function getTransferFetch<T = unknown>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const token = getGetTransferAccessToken();
  if (!token) {
    throw new GetTransferError('GETTRANSFER_ACCESS_TOKEN non configurato', 503);
  }

  const { timeoutMs = 20_000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const base = getGetTransferApiBaseUrl();
    const url = path.startsWith('http')
      ? path
      : `${base}${path.startsWith('/') ? path : `/${path}`}`;

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

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      throw new GetTransferError(
        retryAfter
          ? `Troppe richieste GetTransfer — riprova tra ${retryAfter}s`
          : 'Troppe richieste GetTransfer',
        429,
        json
      );
    }

    if (!res.ok) {
      const errObj = json as { error?: { type?: string; details?: unknown } } | null;
      const msg =
        typeof errObj?.error === 'object' && errObj.error
          ? `GetTransfer ${res.status}`
          : `GetTransfer ${res.status}`;
      throw new GetTransferError(msg, res.status, json);
    }

    return json as T;
  } catch (e) {
    if (e instanceof GetTransferError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new GetTransferError('Timeout GetTransfer', 504);
    }
    throw new GetTransferError(
      e instanceof Error ? e.message : 'Errore GetTransfer',
      502
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRouteInfo(params: RouteInfoParams): Promise<unknown> {
  const query = buildRouteInfoQuery(params);
  return getTransferFetch(`/route_info?${query}`);
}
