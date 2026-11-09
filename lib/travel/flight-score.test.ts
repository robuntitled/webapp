import { describe, expect, it } from 'vitest';
import {
  nearbyDateWindow,
  pickRecommendedFlights,
  scoreFlightOffer,
  suggestNearbyFlightDay,
  type ScoredFlightInput,
} from '@/lib/travel/flight-score';

const offers: ScoredFlightInput[] = [
  {
    id: 'a',
    price: 400,
    stops: 1,
    durationMinutes: 40 * 60,
    overnightLayoverMinutes: 300,
    arrivalHourLocal: 3,
  },
  {
    id: 'b',
    price: 520,
    stops: 0,
    durationMinutes: 12 * 60,
    overnightLayoverMinutes: 0,
    arrivalHourLocal: 14,
  },
  {
    id: 'c',
    price: 450,
    stops: 1,
    durationMinutes: 18 * 60,
    overnightLayoverMinutes: 0,
    arrivalHourLocal: 16,
    minConnectionMinutes: 40,
    selfTransfer: true,
  },
];

describe('flight-score', () => {
  it('ranks direct short flight better than long overnight', () => {
    const sa = scoreFlightOffer(offers[0]!, offers);
    const sb = scoreFlightOffer(offers[1]!, offers);
    expect(sb.total).toBeLessThan(sa.total);
  });

  it('picks conveniente / veloce / equilibrato labels', () => {
    const picks = pickRecommendedFlights(offers);
    expect(picks.map((p) => p.kind)).toContain('cheapest');
    expect(picks.map((p) => p.kind)).toContain('fastest');
    expect(picks.find((p) => p.kind === 'cheapest')?.offerId).toBe('a');
    expect(picks.find((p) => p.kind === 'fastest')?.offerId).toBe('b');
  });

  it('suggests a nearby day when selected day is much worse', () => {
    const badges = [
      {
        date: '2026-08-13',
        cheapestPrice: 400,
        minStops: 1,
        minDurationMinutes: 40 * 60,
      },
      {
        date: '2026-08-10',
        cheapestPrice: 520,
        minStops: 0,
        minDurationMinutes: 12 * 60,
      },
      {
        date: '2026-08-11',
        cheapestPrice: 480,
        minStops: 1,
        minDurationMinutes: 20 * 60,
      },
    ];
    const tip = suggestNearbyFlightDay('2026-08-13', badges);
    expect(tip).toBeTruthy();
    expect(tip!.suggestedDate).toBe('2026-08-10');
    expect(tip!.reasonIt).toMatch(/10 agosto/i);
    expect(tip!.reasonIt).toMatch(/diretto|12 ore/i);
  });

  it('builds ±2 day window helper', () => {
    expect(nearbyDateWindow('2026-08-10', 2)).toEqual([
      '2026-08-08',
      '2026-08-09',
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
    ]);
  });
});
