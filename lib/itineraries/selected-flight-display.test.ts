import { describe, expect, it } from 'vitest';
import {
  applyOfferToSnapshotLeg,
  formatDurationIt,
  formatStopsIt,
  snapshotLegToTripLeg,
} from '@/lib/itineraries/selected-flight-display';
import type { SelectedFlightLegSnapshot } from '@/lib/itineraries/selected-flight-plan';

const base: SelectedFlightLegSnapshot = {
  id: 'l1',
  kind: 'outbound',
  originIata: 'MXP',
  destinationIata: 'KEF',
  date: '2026-12-18',
  labelIt: 'MXP → KEF',
  offerId: 'o1',
  price: 220,
  currency: 'EUR',
  stops: 0,
  durationMinutes: 215,
  airline: 'Icelandair',
  departureAt: '2026-12-18T08:10:00.000Z',
  arrivalAt: '2026-12-18T11:45:00.000Z',
};

describe('selected-flight-display', () => {
  it('formats stops and duration in Italian', () => {
    expect(formatStopsIt(0)).toBe('Diretto');
    expect(formatStopsIt(1)).toBe('1 scalo/i');
    expect(formatDurationIt(215)).toBe('3 h 35 min');
  });

  it('maps snapshot leg to TripFlightLeg for Modifica voli', () => {
    const leg = snapshotLegToTripLeg(base, 2);
    expect(leg.offer?.offerId).toBe('o1');
    expect(leg.passengers).toBe(2);
    expect(leg.status).toBe('selected');
  });

  it('applies a new offer onto the snapshot leg', () => {
    const next = applyOfferToSnapshotLeg(base, '2026-12-19', {
      offerId: 'o2',
      price: 199,
      currency: 'EUR',
      originIata: 'MXP',
      destinationIata: 'KEF',
      departureAt: '2026-12-19T07:00:00.000Z',
      arrivalAt: '2026-12-19T10:30:00.000Z',
      stops: 1,
      durationMinutes: 300,
      airline: 'SAS',
      capturedAt: 1,
    });
    expect(next.date).toBe('2026-12-19');
    expect(next.price).toBe(199);
    expect(next.stops).toBe(1);
    expect(next.airline).toBe('SAS');
  });
});
