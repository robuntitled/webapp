import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ReactLeafletTripMap numbered stops + attribution', () => {
  const src = readFileSync(
    new URL('../../components/maps/ReactLeafletTripMap.tsx', import.meta.url),
    'utf8'
  );

  it('renders numbered stop markers from dayIndex', () => {
    expect(src).toContain('stopNumber');
    expect(src).toContain('makeIcon(highlighted, stopNumber)');
  });

  it('keeps Leaflet attribution control enabled (license credits)', () => {
    expect(src).toMatch(/attributionControl(?!\s*=\s*\{?false)/);
    expect(src).not.toContain('[&_.leaflet-control-attribution]:!hidden');
    expect(src).not.toMatch(/attributionControl=\{false\}/);
  });

  it('uses stylized light basemap variant', () => {
    expect(src).toContain("getLeafletTileLayer('stylized')");
  });
});
