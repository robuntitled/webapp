import 'server-only';

import {
  getDuffelAccessToken,
  getDuffelApiVersion,
  getDuffelBaseUrl,
} from '@/lib/duffel/config';

export class DuffelError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public body?: unknown
  ) {
    super(message);
    this.name = 'DuffelError';
  }
}

type DuffelErrorBody = {
  errors?: Array<{
    type?: string;
    title?: string;
    message?: string;
    code?: string;
  }>;
};

export type DuffelFetchOptions = RequestInit & {
  timeoutMs?: number;
  deviceIp?: string;
  deviceUserAgent?: string;
};

function parseDuffelError(status: number, json: unknown): DuffelError {
  const body = json as DuffelErrorBody | null;
  const first = body?.errors?.[0];
  const msg = first?.message || first?.title || `Duffel ${status}`;
  const code = first?.code || first?.type;
  return new DuffelError(msg, status, code, json);
}

export async function duffelFetch<T = unknown>(
  path: string,
  init?: DuffelFetchOptions
): Promise<T> {
  const token = getDuffelAccessToken();
  if (!token) {
    throw new DuffelError('DUFFEL_ACCESS_TOKEN non configurato', 503, 'missing_token');
  }

  const { timeoutMs = 45_000, deviceIp, deviceUserAgent, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = path.startsWith('http')
      ? path
      : `${getDuffelBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

    const extraHeaders: Record<string, string> = {};
    if (deviceIp && deviceIp !== 'unknown') {
      extraHeaders['x-duffel-device-ip'] = deviceIp;
    }
    if (deviceUserAgent) {
      extraHeaders['x-duffel-device-user-agent'] = deviceUserAgent.slice(0, 512);
    }

    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json',
        'Duffel-Version': getDuffelApiVersion(),
        Authorization: `Bearer ${token}`,
        ...extraHeaders,
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
      throw parseDuffelError(res.status, json);
    }

    return json as T;
  } catch (e) {
    if (e instanceof DuffelError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new DuffelError('Timeout Duffel', 504, 'timeout');
    }
    throw new DuffelError(
      e instanceof Error ? e.message : 'Errore Duffel',
      502,
      'network'
    );
  } finally {
    clearTimeout(timer);
  }
}
