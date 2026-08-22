import { describe, expect, it } from 'vitest';
import { datesForDuration } from '@/lib/itineraries/dates';
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
});
