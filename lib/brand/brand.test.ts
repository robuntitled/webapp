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

  it('keeps flygetr.it fallback until NEXT_PUBLIC_APP_URL cutover', () => {
    const url = getSiteUrl();
    expect(url.endsWith('/')).toBe(false);
    // Without env override in tests, fallback is the current domain.
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      expect(url).toBe('https://flygetr.it');
    }
  });

  it('formats email display name without changing the address', () => {
    expect(brandEmailFrom('onboarding@resend.dev')).toBe(
      'Noivia <onboarding@resend.dev>'
    );
  });
});
