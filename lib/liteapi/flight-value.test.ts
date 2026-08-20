import { describe, expect, it } from 'vitest';
import { layoversFromSegments, formatLayoversLine } from '@/lib/liteapi/flight-layovers';
import { isBrutalItinerary, pickSensibleOffer, flightValueScore } from '@/lib/liteapi/flight-value';

describe('layovers', () => {
  it('names the stop airport and wait', () => {
    const layovers = layoversFromSegments([
      {
        origin: 'ATH',
        destination: 'AMM',
        departureAt: '2026-10-28T18:45:00',
        arrivalAt: '2026-10-28T21:00:00',
      },
      {
        origin: 'AMM',
        destination: 'DXB',
        departureAt: '2026-10-29T06:20:00',
        arrivalAt: '2026-10-29T12:45:00',
      },
    ]);
    expect(layovers).toEqual([{ airport: 'AMM', waitMinutes: 560 }]);
    expect(formatLayoversLine(layovers)).toBe('Scalo AMM · 9h 20m');
  });
});

describe('sensible combo pick', () => {
  it('rejects a 16h hop when a 5h option exists', () => {
    expect(
      isBrutalItinerary({ price: 132, durationMinutes: 16 * 60, stops: 1 }, 5 * 60)
    ).toBe(true);
  });

  it('prefers a slightly dearer direct over a cheap overnight layover', () => {
    const picked = pickSensibleOffer([
      {
        price: 132,
        durationMinutes: 16 * 60,
        stops: 1,
        layovers: [{ airport: 'AMM', waitMinutes: 9 * 60 }],
      },
      { price: 198, durationMinutes: 5 * 60, stops: 0, layovers: [] },
    ]);
    expect(picked?.price).toBe(198);
    expect(flightValueScore(picked!)).toBeLessThan(
      flightValueScore({
        price: 132,
        durationMinutes: 16 * 60,
        stops: 1,
        layovers: [{ airport: 'AMM', waitMinutes: 9 * 60 }],
      })
    );
  });
});
