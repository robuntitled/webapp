/**
 * Origine reale della richiesta (preview / prod), ignorando AUTH_URL.
 * NextAuth `reqWithEnvURL` riscrive nextUrl sull'origine di AUTH_URL:
 * i redirect del middleware devono usare host/proto inoltrati.
 */

const KNOWN_APP_HOST_RE =
  /(^|\.)vercel\.app$/i;

function isKnownAppHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    KNOWN_APP_HOST_RE.test(h) ||
    h === 'flygetr.it' ||
    h === 'www.flygetr.it'
  );
}

export function requestOriginFromHeaders(headers: Headers): string | null {
  const hostRaw =
    headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    headers.get('host')?.split(',')[0]?.trim();
  if (!hostRaw) return null;

  const protoRaw =
    headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (hostRaw.includes('localhost') || hostRaw.startsWith('127.') ? 'http' : 'https');
  const proto = protoRaw.replace(/:$/, '');
  return `${proto}://${hostRaw}`;
}

export function absoluteUrlOnRequest(
  path: string,
  headers: Headers,
  fallbackOrigin?: string
): URL {
  const origin =
    requestOriginFromHeaders(headers) ||
    fallbackOrigin ||
    'http://localhost:3000';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalized, origin);
}

/**
 * Porta un URL di redirect Auth.js sull'origine della request.
 * - path relativi → assoluti sull'host corrente (next-auth/react fa `new URL(data.url)`)
 * - URL verso AUTH_URL / host app noti → stesso path sull'host corrente
 */
export function rewriteAuthUrlToRequestOrigin(
  raw: string,
  requestOrigin: string,
  authOrigin?: string
): string {
  try {
    const parsed = raw.startsWith('/')
      ? new URL(raw, requestOrigin)
      : new URL(raw);
    const shouldRewrite =
      parsed.origin === requestOrigin ||
      (authOrigin && parsed.origin === authOrigin) ||
      isKnownAppHost(parsed.hostname) ||
      raw.startsWith('/');
    if (!shouldRewrite) return raw;
    return `${requestOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return raw;
  }
}

function authEnvOrigin(): string {
  const authUrl =
    process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || '';
  try {
    return authUrl ? new URL(authUrl).origin : '';
  } catch {
    return '';
  }
}

/**
 * Riscrive Location / Set-Cookie / JSON `{ url }` authjs che puntano a AUTH_URL
 * (o path relativi) verso l'host corrente della preview/request.
 */
export async function rewriteAuthResponseToRequestHost(
  req: Request,
  res: Response
): Promise<Response> {
  const requestOrigin = requestOriginFromHeaders(req.headers);
  if (!requestOrigin) return res;

  const authOrigin = authEnvOrigin();
  const headers = new Headers(res.headers);
  let changed = false;

  const location = headers.get('location');
  if (location) {
    const next = rewriteAuthUrlToRequestOrigin(location, requestOrigin, authOrigin);
    if (next !== location) {
      headers.set('location', next);
      changed = true;
    }
  }

  const getSetCookie =
    typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  if (getSetCookie.length) {
    const rewrittenCookies: string[] = [];
    let cookiesChanged = false;
    for (const cookie of getSetCookie) {
      let next = cookie;
      if (authOrigin && cookie.includes(encodeURIComponent(authOrigin))) {
        next = cookie
          .split(encodeURIComponent(authOrigin))
          .join(encodeURIComponent(requestOrigin));
        cookiesChanged = true;
      } else if (authOrigin && cookie.includes(authOrigin)) {
        next = cookie.split(authOrigin).join(requestOrigin);
        cookiesChanged = true;
      }
      // callback-url assoluti verso altri host app (anche senza AUTH_URL)
      const cbMatch = next.match(
        /((?:__Secure-)?authjs\.callback-url)=([^;]+)/i
      );
      if (cbMatch) {
        try {
          const decoded = decodeURIComponent(cbMatch[2]!);
          const fixed = rewriteAuthUrlToRequestOrigin(
            decoded,
            requestOrigin,
            authOrigin
          );
          if (fixed !== decoded) {
            next = next.replace(
              cbMatch[0],
              `${cbMatch[1]}=${encodeURIComponent(fixed)}`
            );
            cookiesChanged = true;
          }
        } catch {
          /* ignore */
        }
      }
      rewrittenCookies.push(next);
    }
    if (cookiesChanged) {
      headers.delete('set-cookie');
      for (const c of rewrittenCookies) headers.append('set-cookie', c);
      changed = true;
    }
  }

  const contentType = headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const text = await res.clone().text();
      const data = JSON.parse(text) as { url?: unknown; [key: string]: unknown };
      if (typeof data.url === 'string') {
        const nextUrl = rewriteAuthUrlToRequestOrigin(
          data.url,
          requestOrigin,
          authOrigin
        );
        if (nextUrl !== data.url) {
          data.url = nextUrl;
          changed = true;
          return new Response(JSON.stringify(data), {
            status: res.status,
            statusText: res.statusText,
            headers,
          });
        }
      }
      // providers: signinUrl / callbackUrl puntano ad AUTH_URL
      let providersChanged = false;
      for (const value of Object.values(data)) {
        if (!value || typeof value !== 'object') continue;
        const p = value as { signinUrl?: string; callbackUrl?: string };
        if (typeof p.signinUrl === 'string') {
          const n = rewriteAuthUrlToRequestOrigin(
            p.signinUrl,
            requestOrigin,
            authOrigin
          );
          if (n !== p.signinUrl) {
            p.signinUrl = n;
            providersChanged = true;
          }
        }
        if (typeof p.callbackUrl === 'string') {
          const n = rewriteAuthUrlToRequestOrigin(
            p.callbackUrl,
            requestOrigin,
            authOrigin
          );
          if (n !== p.callbackUrl) {
            p.callbackUrl = n;
            providersChanged = true;
          }
        }
      }
      if (providersChanged) {
        changed = true;
        return new Response(JSON.stringify(data), {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      }
    } catch {
      /* non-JSON o body già consumato: ignora */
    }
  }

  if (!changed) return res;
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
