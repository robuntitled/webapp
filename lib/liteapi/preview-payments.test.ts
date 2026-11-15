import { afterEach, describe, expect, it, vi } from 'vitest';

describe('preview payment guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('blocks live key on preview even if LITEAPI_PAYMENT_ENV=sandbox (incident fix)', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('LITEAPI_KEY', 'live_shared_key_xyz');
    vi.stubEnv('LITEAPI_PAYMENT_ENV', 'sandbox');
    const { areLivePaymentsBlockedOnThisDeploy, getLiteApiPaymentEnv } =
      await import('@/lib/liteapi/config');
    expect(areLivePaymentsBlockedOnThisDeploy()).toBe(true);
    expect(getLiteApiPaymentEnv()).toBe('live');
  });

  it('blocks live payments on preview when key is not sandbox', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('LITEAPI_KEY', 'live_shared_key_xyz');
    vi.stubEnv('LITEAPI_PAYMENT_ENV', '');
    const { areLivePaymentsBlockedOnThisDeploy, PREVIEW_PAYMENTS_DISABLED_IT } =
      await import('@/lib/liteapi/config');
    expect(areLivePaymentsBlockedOnThisDeploy()).toBe(true);
    expect(PREVIEW_PAYMENTS_DISABLED_IT).toMatch(/Anteprima: pagamenti disattivati/);
  });

  it('allows sandbox key on preview', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('LITEAPI_KEY', 'sand_test_key');
    vi.stubEnv('LITEAPI_PAYMENT_ENV', 'sandbox');
    const { areLivePaymentsBlockedOnThisDeploy } = await import('@/lib/liteapi/config');
    expect(areLivePaymentsBlockedOnThisDeploy()).toBe(false);
  });

  it('blocks when VERCEL_ENV unset (local) and key is live', async () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('LITEAPI_KEY', 'live_local_key');
    vi.stubEnv('LITEAPI_PAYMENT_ENV', 'sandbox');
    const { areLivePaymentsBlockedOnThisDeploy } = await import('@/lib/liteapi/config');
    expect(areLivePaymentsBlockedOnThisDeploy()).toBe(true);
  });

  it('does not block production', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('LITEAPI_KEY', 'live_prod_key');
    vi.stubEnv('LITEAPI_PAYMENT_ENV', 'live');
    const { areLivePaymentsBlockedOnThisDeploy } = await import('@/lib/liteapi/config');
    expect(areLivePaymentsBlockedOnThisDeploy()).toBe(false);
  });
});
