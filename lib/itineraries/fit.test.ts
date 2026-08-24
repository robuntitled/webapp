import { describe, expect, it } from 'vitest';
import { fitItineraryToDays, pickTemplateForTrip } from '@/lib/itineraries/fit';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';

describe('fitItineraryToDays', () => {
  it('keeps arrival and departure when shrinking', () => {
    const tpl = findItineraryBySlug('thailandia', 14);
    expect(tpl).toBeTruthy();
    const fitted = fitItineraryToDays(tpl!, 10);
    expect(fitted).toHaveLength(10);
    expect(fitted[0]?.is_arrival).toBe(true);
    expect(fitted[fitted.length - 1]?.is_departure).toBe(true);
  });
});

describe('pickTemplateForTrip', () => {
  it('prefers closest duration for thailandia', () => {
    const tpl = pickTemplateForTrip('thailandia', 12, 'relax');
    expect(tpl?.duration_days).toBeGreaterThanOrEqual(10);
  });
});
