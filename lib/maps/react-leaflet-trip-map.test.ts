import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { plainMapAttribution } from '@/lib/maps/tile-layer';

describe('ReactLeafletTripMap numbered stops + attribution', () => {
  const src = readFileSync(
    new URL('../../components/maps/ReactLeafletTripMap.tsx', import.meta.url),
    'utf8'
  );
  const creditsSrc = readFileSync(
    new URL('../../components/maps/MapCreditsControl.tsx', import.meta.url),
    'utf8'
  );

  it('renders numbered stop markers from dayIndex', () => {
    expect(src).toContain('stopNumber');
    expect(src).toContain('makeIcon(highlighted, stopNumber)');
  });

  it('disables default Leaflet attribution bar and uses MapCreditsControl', () => {
    expect(src).toMatch(/attributionControl=\{false\}/);
    expect(src).toContain('MapCreditsControl');
    expect(src).toContain('MAP_TILES.attribution');
    expect(creditsSrc).toContain("aria-label=\"Crediti mappa\"");
    expect(creditsSrc).toContain('Leaflet');
    expect(creditsSrc).toContain('map-credits-button');
  });

  it('uses stylized light basemap variant', () => {
    expect(src).toContain("getLeafletTileLayer('stylized')");
  });

  it('keeps Esri plain credit text for the popover', () => {
    expect(plainMapAttribution('Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ')).toBe(
      'Tiles © Esri — Esri, DeLorme, NAVTEQ'
    );
  });
});
