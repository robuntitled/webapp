import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_OMIO_PARTNER_ID,
  DEFAULT_OMIO_REDIRECT,
  getOmioNemoBundleUrls,
  getOmioPartnerId,
  getOmioRedirectUrl,
  isOmioWidgetConfigured,
  omioTravelModeAttr,
} from '@/lib/omio/config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Omio Nemo widget config', () => {
  it('defaults partner id and redirect from Impact embed', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_PARTNER_ID', '');
    vi.stubEnv('NEXT_PUBLIC_OMIO_PARTNER_SLUG', '');
    vi.stubEnv('NEXT_PUBLIC_OMIO_REDIRECT_URL', '');
    expect(getOmioPartnerId()).toBe(DEFAULT_OMIO_PARTNER_ID);
    expect(getOmioRedirectUrl()).toBe(DEFAULT_OMIO_REDIRECT);
    expect(isOmioWidgetConfigured()).toBe(true);
  });

  it('honors env overrides', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_PARTNER_ID', 'custom-partner');
    vi.stubEnv(
      'NEXT_PUBLIC_OMIO_REDIRECT_URL',
      'https://omio.sjv.io/c/1/2/3?u='
    );
    expect(getOmioPartnerId()).toBe('custom-partner');
    expect(getOmioRedirectUrl()).toBe('https://omio.sjv.io/c/1/2/3?u=');
  });

  it('builds Italian Nemo bundle URLs', () => {
    const urls = getOmioNemoBundleUrls('it');
    expect(urls.css).toContain('/bundle/it/bundle.css');
    expect(urls.js).toContain('/bundle/it/bundle.js');
  });

  it('maps travel mode attrs', () => {
    expect(omioTravelModeAttr('bus')).toBe('bus');
    expect(omioTravelModeAttr('train')).toBe('train');
  });
});
