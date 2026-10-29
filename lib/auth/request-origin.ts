/**
 * Origine reale della richiesta (preview / prod), ignorando AUTH_URL.
 * NextAuth `reqWithEnvURL` riscrive nextUrl sull'origine di AUTH_URL:
 * i redirect del middleware devono usare host/proto inoltrati.
 */
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

/** Riscrive Location / Set-Cookie authjs che puntano a AUTH_URL verso l'host corrente. */
export function rewriteAuthResponseToRequestHost(
  req: Request,
  res: Response
): Response {
  const requestOrigin = requestOriginFromHeaders(req.headers);
  if (!requestOrigin) return res;

  const authUrl =
    process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || '';
  let authOrigin = '';
  try {
    if (authUrl) authOrigin = new URL(authUrl).origin;
  } catch {
    authOrigin = '';
  }

  if (!authOrigin || authOrigin === requestOrigin) {
    // Anche senza AUTH_URL, normalizza callback-url assoluti verso host corrente
  }

  const headers = new Headers(res.headers);
  let changed = false;

  const location = headers.get('location');
  if (location) {
    try {
      const loc = new URL(location, authOrigin || requestOrigin);
      const shouldRewrite =
        (authOrigin && loc.origin === authOrigin) ||
        (loc.origin !== requestOrigin &&
          (loc.hostname.endsWith('.vercel.app') ||
            loc.hostname === 'flygetr.it' ||
            loc.hostname === 'www.flygetr.it'));
      if (shouldRewrite) {
        headers.set('location', `${requestOrigin}${loc.pathname}${loc.search}${loc.hash}`);
        changed = true;
      }
    } catch {
      /* ignore */
    }
  }

  const rewrittenCookies: string[] = [];
  const getSetCookie =
    typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  if (getSetCookie.length) {
    headers.delete('set-cookie');
    for (const cookie of getSetCookie) {
      let next = cookie;
      if (authOrigin && cookie.includes(encodeURIComponent(authOrigin))) {
        next = cookie.split(encodeURIComponent(authOrigin)).join(encodeURIComponent(requestOrigin));
        changed = true;
      } else if (authOrigin && cookie.includes(authOrigin)) {
        next = cookie.split(authOrigin).join(requestOrigin);
        changed = true;
      }
      rewrittenCookies.push(next);
    }
    for (const c of rewrittenCookies) headers.append('set-cookie', c);
  }

  if (!changed) return res;
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
