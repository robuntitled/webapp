import { afterEach, describe, expect, it } from 'vitest';
import { getLeafletTileLayer } from '@/lib/maps/tile-layer';

describe('getLeafletTileLayer', () => {
  const prev = process.env.NEXT_PUBLIC_CARTO_API_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
    else process.env.NEXT_PUBLIC_CARTO_API_KEY = prev;
  });

  it('falls back to Esri Light Gray without Carto key (no OSM / no watermark CDN)', () => {
    delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
    const layer = getLeafletTileLayer();
    expect(layer.variant).toBe('stylized');
    expect(layer.url).toContain('arcgisonline.com');
    expect(layer.url).toContain('World_Light_Gray_Base');
    expect(layer.url).toContain('{z}/{y}/{x}');
    expect(layer.url).not.toContain('openstreetmap.org');
    expect(layer.url).not.toContain('cartocdn.com');
    expect(layer.subdomains).toBeUndefined();
  });

  it('uses Carto voyager_nolabels when API key is set', () => {
    process.env.NEXT_PUBLIC_CARTO_API_KEY = 'test-key';
    const layer = getLeafletTileLayer('stylized');
    expect(layer.url).toContain('voyager_nolabels');
    expect(layer.url).toContain('api_key=test-key');
    expect(layer.subdomains).toBe('abcd');
  });
});
