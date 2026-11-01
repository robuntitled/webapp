import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_CONSENT_KEY } from '@/lib/privacy/constants';
import { persistCookieConsent, readCookieConsent } from '@/lib/privacy/cookie-consent';

function mockStorage() {
  const store: Record<string, string> = {};
  return {
    store,
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
}

describe('cookie consent migration', () => {
  beforeEach(() => {
    const ls = mockStorage();
    vi.stubGlobal('localStorage', ls);
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
