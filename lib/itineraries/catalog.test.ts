import { describe, expect, it } from 'vitest';
import {
  assertTemplateShape,
  findItineraryBySlug,
  findItineraryTemplate,
  OFFICIAL_EDITION_SEEDS,
  publishedDestinations,
  PUBLISHED_TEMPLATES,
} from '@/lib/itineraries/catalog';
import { datesForDuration } from '@/lib/itineraries/dates';

describe('itinerary catalog (T10)', () => {
  it('publishes three different Thailandia templates', () => {
    const th = PUBLISHED_TEMPLATES.filter((t) => t.destination_slug === 'thailandia');
    expect(th.map((t) => t.duration_days).sort((a, b) => a - b)).toEqual([10, 14, 21]);
    expect(new Set(th.map((t) => t.template_id)).size).toBe(3);
    expect(th[0]?.days[3]?.title).not.toBe(th[1]?.days[3]?.title);
  });

  it('matches sheet 05 shape', () => {
    expect(PUBLISHED_TEMPLATES.flatMap(assertTemplateShape)).toEqual([]);
  });

  it('exposes only active published destinations', () => {
    const dests = publishedDestinations();
    expect(dests).toHaveLength(1);
    expect(dests[0]?.slug).toBe('thailandia');
    expect(dests[0]?.allowedDurations).toEqual([10, 14, 21]);
  });

  it('switches duration on the same slug', () => {
    expect(findItineraryBySlug('thailandia', 10)?.template_id).toBe('thailandia-10d');
    expect(findItineraryBySlug('thailandia', 21)?.days).toHaveLength(21);
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
