import { COOKIE_CONSENT_KEY } from '@/lib/privacy/constants';

const LEGACY_KEYS = ['flygetr-cookie-consent', 'nomadlink-cookie-consent'] as const;

/** Read consent, migrating legacy localStorage keys once. */
export function readCookieConsent(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          localStorage.setItem(COOKIE_CONSENT_KEY, legacy);
          localStorage.removeItem(key);
          return true;
        }
      }
      if (localStorage.getItem(COOKIE_CONSENT_KEY)) return true;
    }
  } catch {
    /* private mode */
  }
  if (typeof document !== 'undefined') {
    return document.cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_CONSENT_KEY}=`));
  }
  return false;
}

export function persistCookieConsent(value = 'accepted'): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
  document.cookie = `${COOKIE_CONSENT_KEY}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}
