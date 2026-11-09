import { describe, expect, it } from 'vitest';
import {
  bookableNearbyWindow,
  minBookableDateIso,
  prioritizeProbeOrder,
  todayIsoInRome,
} from '@/lib/travel/flight-calendar-dates';

describe('flight-calendar-dates', () => {
  it('never includes dates before minDate and extends forward', () => {
    // Center is today-ish relative to a fixed min
    const win = bookableNearbyWindow('2026-11-09', {
      radiusDays: 2,
      minDate: '2026-11-11',
      targetCount: 5,
    });
    expect(win.every((d) => d >= '2026-11-11')).toBe(true);
    expect(win).toHaveLength(5);
    expect(win[0]).toBe('2026-11-11');
  });

  it('keeps a full ±2 window when center is far enough ahead', () => {
    const win = bookableNearbyWindow('2026-12-10', {
      radiusDays: 2,
      minDate: '2026-11-11',
    });
    expect(win).toEqual([
      '2026-12-08',
      '2026-12-09',
      '2026-12-10',
      '2026-12-11',
      '2026-12-12',
    ]);
  });

  it('prioritizes selected date first', () => {
    const order = prioritizeProbeOrder(
      ['2026-12-08', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12'],
      '2026-12-10'
    );
    expect(order[0]).toBe('2026-12-10');
    expect(order[1]).toMatch(/2026-12-09|2026-12-11/);
  });

  it('min bookable is today+2 in Rome', () => {
    const fixed = new Date('2026-11-09T12:00:00Z');
    expect(todayIsoInRome(fixed)).toBe('2026-11-09');
    expect(minBookableDateIso(fixed)).toBe('2026-11-11');
  });
});
