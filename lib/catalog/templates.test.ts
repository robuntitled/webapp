import { describe, expect, it } from 'vitest';
import { activeCatalogDestinations, findCatalogDestination } from '@/lib/catalog/destinations';
import { CATALOG_TEMPLATES, findCatalogTemplate } from '@/lib/catalog/templates';

describe('catalog', () => {
  it('exposes only active destinations in launch set', () => {
    const active = activeCatalogDestinations();
    expect(active.length).toBeGreaterThanOrEqual(8);
    expect(active.length).toBeLessThanOrEqual(12);
    expect(active.every((d) => d.active)).toBe(true);
  });

  it('builds one template per allowed duration', () => {
    const grecia = findCatalogDestination('grecia');
    expect(grecia?.allowedDurations).toEqual([5, 7, 10]);
    const templates = CATALOG_TEMPLATES.filter((t) => t.destinationId === 'grecia');
    expect(templates.map((t) => t.durationDays).sort((a, b) => a - b)).toEqual([5, 7, 10]);
  });

  it('resolves template id', () => {
    const tpl = findCatalogTemplate('portogallo-7');
    expect(tpl?.destinationId).toBe('portogallo');
    expect(tpl?.durationDays).toBe(7);
  });
});
