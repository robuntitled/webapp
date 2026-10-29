/**
 * Valida `callbackUrl` post-login: solo path relativi stessi-origine.
 * Evita open-redirect verso siti esterni.
 */
export function safeCallbackPath(
  raw: string | null | undefined,
  fallback = '/onboarding'
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  // Solo path relativi (niente URL assoluti / protocol-relative)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('://')) return fallback;
  if (trimmed.startsWith('/api') || trimmed.startsWith('/_next')) return fallback;
  return trimmed;
}

/** Same-origin check for absolute URLs when `origin` is known (browser). */
export function safeCallbackUrl(
  raw: string | null | undefined,
  origin: string,
  fallback = '/onboarding'
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return safeCallbackPath(trimmed, fallback);
  }

  try {
    const url = new URL(trimmed, origin);
    if (url.origin !== origin) return fallback;
    return safeCallbackPath(`${url.pathname}${url.search}${url.hash}`, fallback);
  } catch {
    return fallback;
  }
}

export const AUTH_SIGN_IN_PATH = '/accedi';

/** Costruisce link ad accesso preservando destinazione. */
export function accediHref(callbackPath?: string | null, mode?: 'login' | 'register'): string {
  const params = new URLSearchParams();
  const safe = callbackPath ? safeCallbackPath(callbackPath, '') : '';
  if (safe) params.set('callbackUrl', safe);
  if (mode === 'register') params.set('mode', 'register');
  const q = params.toString();
  return q ? `${AUTH_SIGN_IN_PATH}?${q}` : AUTH_SIGN_IN_PATH;
}
