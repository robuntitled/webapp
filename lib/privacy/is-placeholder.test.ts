import { describe, expect, it } from 'vitest';
import { isPlaceholder } from '@/lib/privacy/is-placeholder';

describe('isPlaceholder', () => {
  it('flags empty, bracket and TODO values', () => {
    expect(isPlaceholder(null)).toBe(true);
    expect(isPlaceholder('')).toBe(true);
    expect(isPlaceholder('[P.IVA da definire]')).toBe(true);
    expect(isPlaceholder('[TODO LEGAL_EMAIL_PRIVACY — privacy@ da definire]')).toBe(
      true
    );
    expect(isPlaceholder('privacy@example.com')).toBe(false);
    expect(isPlaceholder('Noivia')).toBe(false);
  });
});
