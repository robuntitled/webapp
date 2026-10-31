import { describe, expect, it } from 'vitest';
import { accediHref, safeCallbackPath, safeCallbackUrl } from '@/lib/auth/callback-url';

describe('safeCallbackPath', () => {
  it('accetta path relativi sicuri', () => {
    expect(safeCallbackPath('/invito/abc')).toBe('/invito/abc');
    expect(safeCallbackPath('/partenze/1?x=1')).toBe('/partenze/1?x=1');
  });

  it('rifiuta open redirect e path API', () => {
    expect(safeCallbackPath('//evil.com')).toBe('/onboarding');
    expect(safeCallbackPath('https://evil.com/phish')).toBe('/onboarding');
    expect(safeCallbackPath('/api/secret')).toBe('/onboarding');
    expect(safeCallbackPath(null)).toBe('/onboarding');
  });
});

describe('safeCallbackUrl', () => {
  it('accetta URL same-origin', () => {
    expect(
      safeCallbackUrl('https://flygetr.it/invito/x', 'https://flygetr.it')
    ).toBe('/invito/x');
  });

  it('rifiuta origin diversi', () => {
    expect(
      safeCallbackUrl('https://evil.com/x', 'https://flygetr.it')
    ).toBe('/onboarding');
  });
});

describe('accediHref', () => {
  it('costruisce query', () => {
    expect(accediHref('/invito/t', 'register')).toBe(
      '/accedi?callbackUrl=%2Finvito%2Ft&mode=register'
    );
    expect(accediHref()).toBe('/accedi');
  });
});
