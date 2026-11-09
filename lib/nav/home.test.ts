import { describe, expect, it } from 'vitest';
import {
  HOME_HREF,
  USER_AREA_HREF,
  brandHomeHref,
  loggedInBouncePaths,
  shouldBounceLoggedInFrom,
} from '@/lib/nav/home';

describe('home nav policy', () => {
  it('brand home is always /', () => {
    expect(HOME_HREF).toBe('/');
    expect(brandHomeHref()).toBe('/');
    expect(USER_AREA_HREF).toBe('/pratiche');
  });

  it('does not bounce logged-in users away from home', () => {
    expect(loggedInBouncePaths()).not.toContain('/');
    expect(
      shouldBounceLoggedInFrom('/', { userId: true, privacyOk: true })
    ).toBe(false);
  });

  it('bounces logged-in privacy-ok users from /accedi to post-login area', () => {
    expect(
      shouldBounceLoggedInFrom('/accedi', { userId: true, privacyOk: true })
    ).toBe(true);
  });

  it('does not bounce guests or incomplete privacy from /accedi via this helper', () => {
    expect(
      shouldBounceLoggedInFrom('/accedi', { userId: false, privacyOk: false })
    ).toBe(false);
    expect(
      shouldBounceLoggedInFrom('/accedi', { userId: true, privacyOk: false })
    ).toBe(false);
  });

  it('never bounces app surfaces like /organizza via bounce helper', () => {
    for (const path of ['/organizza', '/gruppi', '/pratiche', '/prenota/voli']) {
      expect(
        shouldBounceLoggedInFrom(path, { userId: true, privacyOk: true })
      ).toBe(false);
    }
  });
});
