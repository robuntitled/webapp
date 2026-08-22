import { describe, expect, it } from 'vitest';
import { datesForDuration, staysFromTemplate } from '@/lib/itineraries/dates';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';

describe('itinerary dates (T10/T3)', () => {
  it('maps start + duration to inclusive end', () => {
    expect(datesForDuration('2026-11-12', 10)).toEqual({
      date_from: '2026-11-12',
      date_to: '2026-11-21',
    });
    expect(datesForDuration('2026-12-05', 14).date_to).toBe('2026-12-18');
  });

  it('accepts only launch durations in ?d=', () => {
    expect(parseDurationParam('14')).toBe(14);
    expect(parseDurationParam('7')).toBeUndefined();
    expect(parseDurationParam(['21'])).toBe(21);
  });

  it('splits hotel stays by area', () => {
    const tpl = findItineraryBySlug('thailandia', 10);
    expect(tpl).toBeTruthy();
    const stays = staysFromTemplate(tpl!, '2026-11-12');
    expect(stays.length).toBeGreaterThanOrEqual(2);
    expect(stays[0]?.city).toBe('Bangkok');
    expect(stays.some((s) => s.city === 'Koh Samui')).toBe(true);
  });
});
