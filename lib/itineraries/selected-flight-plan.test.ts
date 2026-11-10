import { describe, expect, it } from 'vitest';
import {
  parseSelectedFlightPlan,
  plannedLegsFromSelected,
  snapshotFromPlannedLegs,
  tripPlanToSelectedSnapshot,
  type SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';
import type { TripFlightPlan } from '@/lib/travel/trip-flight-legs';

const snap: SelectedFlightPlanSnapshot = {
  version: 1,
  travelers: 2,
  returnHome: true,
  savedAt: '2026-11-10T00:00:00.000Z',
  legs: [
    {
      id: 'out',
      kind: 'outbound',
      originIata: 'MXP',
      destinationIata: 'HAN',
      date: '2026-12-10',
      labelIt: 'Partenza',
      offerId: 'off-1',
      price: 474,
      currency: 'EUR',
      stops: 1,
      durationMinutes: 900,
      airline: 'Iberia',
      departureAt: '2026-12-10T10:00:00',
      arrivalAt: '2026-12-11T01:00:00',
    },
  ],
};

describe('selected-flight-plan', () => {
  it('parses persisted jsonb snapshots', () => {
    expect(parseSelectedFlightPlan(snap)?.legs[0]?.offerId).toBe('off-1');
    expect(parseSelectedFlightPlan({ version: 2, legs: [] })).toBeNull();
  });

  it('builds planned_legs fallback and reverse snapshot', () => {
    const planned = plannedLegsFromSelected(snap);
    expect(planned).toEqual([
      {
        origin: 'MXP',
        destination: 'HAN',
        date: '2026-12-10',
        kind: 'outbound',
      },
    ]);
    const fromPlanned = snapshotFromPlannedLegs(planned, 2);
    expect(fromPlanned?.legs[0]?.originIata).toBe('MXP');
    expect(fromPlanned?.legs[0]?.offerId).toBeNull();
  });

  it('snapshots TripFlightPlan for DB save (skips domestic/internal)', () => {
    const plan = {
      returnHome: true,
      legs: [
        {
          id: 'a',
          kind: 'outbound',
          originIata: 'MXP',
          destinationIata: 'HAN',
          date: '2026-12-10',
          labelIt: 'Partenza',
          status: 'selected',
          offer: {
            offerId: 'x',
            price: 400,
            currency: 'EUR',
            originIata: 'MXP',
            destinationIata: 'HAN',
            departureAt: '2026-12-10T10:00:00',
            arrivalAt: '2026-12-10T22:00:00',
            stops: 0,
            durationMinutes: 720,
            airline: 'VN',
            capturedAt: 1,
          },
        },
        {
          id: 'b',
          kind: 'internal',
          originIata: 'HAN',
          destinationIata: 'DAD',
          date: '2026-12-12',
          labelIt: 'Interno',
          status: 'empty',
          offer: null,
        },
      ],
    } as TripFlightPlan;
    const out = tripPlanToSelectedSnapshot(plan, 2);
    expect(out?.legs).toHaveLength(1);
    expect(out?.legs[0]?.offerId).toBe('x');
    expect(out?.travelers).toBe(2);
  });
});
