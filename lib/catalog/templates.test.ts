import { describe, expect, it } from 'vitest';
import { wizardCatalogDestinations, findCatalogDestination } from '@/lib/catalog/destinations';
import { CATALOG_TEMPLATES, findCatalogTemplate } from '@/lib/catalog/templates';

describe('catalog', () => {
  it('uses Excel nations and three durations', () => {
    const dests = wizardCatalogDestinations();
    expect(dests.some((d) => d.id === 'indonesia')).toBe(true);
    expect(dests.some((d) => d.id === 'bali')).toBe(false);
    const grecia = findCatalogDestination('grecia');
    expect(grecia?.allowedDurations).toEqual([5, 7, 10]);
    const giappone = findCatalogDestination('giappone');
    expect(giappone?.allowedDurations).toEqual([10, 14, 21]);
  });

  it('keeps duration out of template titles', () => {
    const tpl = findCatalogTemplate('portogallo-7');
    expect(tpl?.title).toBe('Portogallo');
    expect(tpl?.title.includes('giorni')).toBe(false);
  });

  it('loads excel days for a template', () => {
    const templates = CATALOG_TEMPLATES.filter((t) => t.destinationId === 'grecia');
    expect(templates.map((t) => t.durationDays).sort((a, b) => a - b)).toEqual([5, 7, 10]);
    const seven = templates.find((t) => t.durationDays === 7);
    expect(seven?.days.length).toBe(7);
    expect(seven?.days[0]?.arrival).toBe(true);
  });
});
