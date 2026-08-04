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

/** In the sandbox, book_now offers exist only for Istanbul and London Heathrow. */
export const SANDBOX_NO_OFFERS_HINT =
  'In sandbox le offerte book_now esistono solo per Istanbul (IST) e Londra Heathrow.';

export function isGetTransferSandbox(): boolean {
  const env = process.env.GETTRANSFER_ENV?.trim().toLowerCase();
  if (env === 'sandbox' || env === 'test') return true;
  return Boolean(process.env.GETTRANSFER_API_BASE?.includes('gtrbox.org'));
}

export type RouteInfoPoint = {
  lat: number;
  lng: number;
  /** ISO 3166-1 alpha-2, uppercase. Required by the API via countries[]. */
  countryCode?: string;
};

export type RouteInfoParams = {
  points: RouteInfoPoint[];
  pax: number;
  dateTo: string;
  currency?: string;
  distanceUnit?: 'km' | 'm';
  /** Overrides the country codes derived from `points`. */
  countries?: Array<string | undefined>;
};

/**
 * Per spec: one `countries[]` when the route stays inside one country, two
 * (from → to order) when cross-border. Unknown codes are dropped entirely
 * rather than sent empty.
 */
export function normalizeCountryCodes(
  codes: Array<string | undefined | null>
): string[] {
  const clean = codes
    .map((c) => c?.trim().toUpperCase())
    .filter((c): c is string => Boolean(c && /^[A-Z]{2}$/.test(c)));
  if (clean.length > 1 && clean.every((c) => c === clean[0])) {
    return [clean[0]];
  }
  return clean;
}

/** Builds query string for GET /route_info (exported for tests). */
export function buildRouteInfoQuery(params: RouteInfoParams): string {
  const sp = new URLSearchParams();
  for (const p of params.points) {
    // Spec requires parentheses: points[]=(lat,lng) → %28lat%2Clng%29
    sp.append('points[]', `(${p.lat},${p.lng})`);
  }

  const countries = normalizeCountryCodes(
    params.countries ?? params.points.map((p) => p.countryCode)
  );
  for (const code of countries) {
    sp.append('countries[]', code);
  }

  sp.set('with_prices', 'true');
  sp.set('pax', String(Math.max(1, params.pax)));
  sp.set('date_to', params.dateTo);
  sp.set('currency', params.currency ?? 'EUR');
  sp.set('distance_unit', params.distanceUnit ?? 'km');
  return sp.toString();
}

/**
 * `date_to` is the pickup time **local to the pickup point**. The spec examples
 * always carry an explicit UTC offset (e.g. `2026-07-15T18:30:00+07:00`), but we
 * do not resolve destination timezones, so the default stays naive
 * (`YYYY-MM-DDTHH:mm:00`) — which the API interprets as local time.
 * TODO: verify naive vs. offset behaviour in sandbox once the token arrives;
 * `GETTRANSFER_DATE_TO_OFFSET` (e.g. `+03:00` or `Z`) forces an explicit offset.
 */
export function buildDateTo(
  date: string,
  time: string,
  offset?: string | null
): string {
  const raw = (offset ?? process.env.GETTRANSFER_DATE_TO_OFFSET ?? '').trim();
  if (!raw) return `${date}T${time}:00`;
  if (raw.toUpperCase() === 'Z') return `${date}T${time}:00Z`;
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(raw);
  if (!match) return `${date}T${time}:00`;
  return `${date}T${time}:00${match[1]}${match[2]}:${match[3]}`;
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
  if (process.env.GETTRANSFER_DEBUG === '1') {
    console.debug(
      '[gettransfer] GET',
      `${getGetTransferApiBaseUrl()}/route_info?${query}`
    );
  }
  return getTransferFetch(`/route_info?${query}`);
}
