import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_CONSENT_KEY } from '@/lib/privacy/constants';
import { persistCookieConsent, readCookieConsent } from '@/lib/privacy/cookie-consent';

describe('cookie consent migration', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    vi.stubGlobal('document', {
      cookie: '',
    });
  });

  it('migrates flygetr-cookie-consent to consent-v1', () => {
    localStorage.setItem('flygetr-cookie-consent', 'accepted');
    expect(readCookieConsent()).toBe(true);
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('accepted');
    expect(localStorage.getItem('flygetr-cookie-consent')).toBeNull();
  });

  it('migrates nomadlink-cookie-consent', () => {
    localStorage.setItem('nomadlink-cookie-consent', 'accepted');
    expect(readCookieConsent()).toBe(true);
    expect(localStorage.getItem('nomadlink-cookie-consent')).toBeNull();
  });

  it('persist writes consent-v1', () => {
    persistCookieConsent();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBe('accepted');
  });
});
