import { describe, expect, it } from 'vitest';
import {
  assertTemplateShape,
  findItineraryBySlug,
  findItineraryTemplate,
  minBudgetHintForDestination,
  OFFICIAL_EDITION_SEEDS,
  orientativeBudgetHint,
  publishedDestinations,
  PUBLISHED_TEMPLATES,
} from '@/lib/itineraries/catalog';
import { datesForDuration } from '@/lib/itineraries/dates';
import { ACTIVE_MASTER_SLUGS } from '@/lib/itineraries/masters';

describe('itinerary catalog (masters)', () => {
  it('publishes three different Thailandia templates', () => {
    const th = PUBLISHED_TEMPLATES.filter((t) => t.destination_slug === 'thailandia');
    expect(th.map((t) => t.duration_days).sort((a, b) => a - b)).toEqual([10, 14, 21]);
    expect(new Set(th.map((t) => t.template_id)).size).toBe(3);
  });

  it('publishes curated masters for all active destinations', () => {
    for (const slug of ACTIVE_MASTER_SLUGS) {
      expect(PUBLISHED_TEMPLATES.some((t) => t.destination_slug === slug)).toBe(true);
    }
  });

  it('matches sheet shape (arrival/departure)', () => {
    expect(PUBLISHED_TEMPLATES.flatMap(assertTemplateShape)).toEqual([]);
  });

  it('exposes published destinations for every master', () => {
    const dests = publishedDestinations();
    expect(dests.length).toBe(ACTIVE_MASTER_SLUGS.length);
    expect(dests.map((d) => d.slug).sort()).toEqual([...ACTIVE_MASTER_SLUGS].sort());
  });

  it('switches duration on the same slug', () => {
    expect(findItineraryBySlug('thailandia', 10)?.template_id).toBe('thailandia-10d');
    expect(findItineraryBySlug('thailandia', 21)?.days).toHaveLength(21);
  });

  it('maps non-exact duration to nearest template', () => {
    expect(findItineraryBySlug('thailandia', 15)?.template_id).toBe('thailandia-14d');
    const b14 = orientativeBudgetHint('thailandia', 14);
    const b10 = orientativeBudgetHint('thailandia', 10);
    expect(b14).toBeTruthy();
    expect(b10).toBeTruthy();
    expect(b14!).toBeGreaterThanOrEqual(b10!);
    expect(minBudgetHintForDestination('thailandia')).toBe(b10);
  });

  it('seeds official editions with matching duration dates', () => {
    expect(OFFICIAL_EDITION_SEEDS).toHaveLength(3);
    for (const seed of OFFICIAL_EDITION_SEEDS) {
      const tpl = findItineraryTemplate(seed.template_id);
      expect(tpl).toBeTruthy();
      expect(datesForDuration(seed.date_from, tpl!.duration_days).date_to).toBe(seed.date_to);
    }
  });
});
