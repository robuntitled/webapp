import { describe, expect, it, vi } from 'vitest';
import {
  buildOmioIframeSrc,
  buildOmioWidgetLoadOptions,
  getOmioSubId,
  isOmioWidgetConfigured,
  resolveOmioWidgetScriptUrl,
} from '@/lib/omio/config';

describe('resolveOmioWidgetScriptUrl', () => {
  it('prefers explicit script URL override', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_WIDGET_SCRIPT_URL', 'https://cdn.example/omio.js');
    vi.stubEnv('NEXT_PUBLIC_OMIO_PARTNER_SLUG', 'nomadlink');
    expect(resolveOmioWidgetScriptUrl()).toBe('https://cdn.example/omio.js');
  });

  it('builds URL from partner slug', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_WIDGET_SCRIPT_URL', '');
    vi.stubEnv('NEXT_PUBLIC_OMIO_PARTNER_SLUG', 'nomadlink');
    expect(resolveOmioWidgetScriptUrl()).toBe(
      'https://widgets-v2.omio.com/nomadlink/widgets.js'
    );
  });
});

describe('isOmioWidgetConfigured', () => {
  it('is true with iframe src only', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_WIDGET_SCRIPT_URL', '');
    vi.stubEnv('NEXT_PUBLIC_OMIO_PARTNER_SLUG', '');
    vi.stubEnv('NEXT_PUBLIC_OMIO_WIDGET_IFRAME_SRC', 'https://www.omio.com/widget');
    expect(isOmioWidgetConfigured()).toBe(true);
  });
});

describe('buildOmioWidgetLoadOptions', () => {
  it('includes transport mode and locale', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_WIDGET_LOCALE', 'it');
    expect(buildOmioWidgetLoadOptions('train')).toMatchObject({
      locale: 'it',
      preferredTravelMode: 'train',
      subId: 'prenota_treni',
    });
  });
});

describe('getOmioSubId', () => {
  it('uses dedicated env per mode', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_SUBID_BUS', 'bus_tab');
    expect(getOmioSubId('bus')).toBe('bus_tab');
    expect(getOmioSubId('train')).toBe('prenota_treni');
  });
});

describe('buildOmioIframeSrc', () => {
  it('appends mode query params', () => {
    vi.stubEnv('NEXT_PUBLIC_OMIO_WIDGET_IFRAME_SRC', 'https://www.omio.com/embed/search');
    vi.stubEnv('NEXT_PUBLIC_OMIO_WIDGET_LOCALE', 'it');
    const url = buildOmioIframeSrc('bus');
    expect(url).toContain('preferredTravelMode=bus');
    expect(url).toContain('locale=it');
  });
});
