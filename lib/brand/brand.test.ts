import { describe, expect, it } from 'vitest';
import {
  BRAND_NAME,
  brandEmailFrom,
  getSiteUrl,
} from '@/lib/brand';

describe('brand source of truth', () => {
  it('exports Noivia as brand name', () => {
    expect(BRAND_NAME).toBe('Noivia');
  });

  it('getSiteUrl precedence without env', () => {
    const prev = { ...process.env };
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe('http://localhost:3000');
    process.env.NEXT_PUBLIC_APP_URL = prev.NEXT_PUBLIC_APP_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = prev.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_BRANCH_URL = prev.VERCEL_BRANCH_URL;
    process.env.VERCEL_URL = prev.VERCEL_URL;
  });

  it('strips trailing slash from NEXT_PUBLIC_APP_URL', () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/';
    expect(getSiteUrl()).toBe('https://example.com');
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });

  it('formats email display name without changing the address', () => {
    expect(brandEmailFrom('onboarding@resend.dev')).toBe(
      'Noivia <onboarding@resend.dev>'
    );
  });
});
