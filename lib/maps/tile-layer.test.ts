import { afterEach, describe, expect, it } from 'vitest';
import { getLeafletTileLayer } from '@/lib/maps/tile-layer';

describe('getLeafletTileLayer', () => {
  const prev = process.env.NEXT_PUBLIC_CARTO_API_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
    else process.env.NEXT_PUBLIC_CARTO_API_KEY = prev;
  });

  it('defaults to stylized Carto voyager without labels', () => {
    delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
    const layer = getLeafletTileLayer();
    expect(layer.variant).toBe('stylized');
    expect(layer.url).toContain('voyager_nolabels');
    expect(layer.url).not.toContain('openstreetmap.org');
    expect(layer.attribution).toMatch(/CARTO/i);
  });

  it('supports soft and labeled variants', () => {
    expect(getLeafletTileLayer('soft').url).toContain('light_nolabels');
    expect(getLeafletTileLayer('labeled').url).toContain('/voyager/');
    expect(getLeafletTileLayer('labeled').url).not.toContain('nolabels');
  });
});
