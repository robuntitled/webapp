import { describe, expect, it } from 'vitest';
import { sampleStartDates } from '@/lib/composer/flight-route';

describe('sampleStartDates', () => {
  it('keeps samples inside the window for the trip length', () => {
    const starts = sampleStartDates('2026-09-01', '2026-10-15', 10, 8);
    expect(starts.length).toBeGreaterThan(1);
    expect(starts[0]).toBe('2026-09-01');
    const last = starts[starts.length - 1];
    expect(last && last <= '2026-10-06').toBe(true);
  });

  it('returns a single start if the window is tight', () => {
    const starts = sampleStartDates('2026-09-01', '2026-09-08', 10, 8);
    expect(starts).toEqual(['2026-09-01']);
  });
});
