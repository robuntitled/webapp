import { describe, expect, it } from 'vitest';
import {
  analyzeLegTiming,
  buildDefaultTripFlightPlan,
  flagStaleLegs,
  providerSearchModeForPlan,
  selectOfferOnLeg,
  selectedLegsTotal,
} from '@/lib/travel/trip-flight-legs';

describe('trip-flight-legs', () => {
  it('builds closed roundtrip for single hub', () => {
    const plan = buildDefaultTripFlightPlan({
      homeOriginIata: 'MXP',
      arrivalIata: 'BKK',
      departureIata: 'BKK',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      passengers: 1,
      multiCountry: false,
      returnHome: true,
    });
    expect(plan.shape).toBe('roundtrip');
    expect(plan.legs).toHaveLength(2);
    expect(providerSearchModeForPlan(plan).canUseClosedRoundtrip).toBe(true);
  });

  it('builds oneway without return home', () => {
    const plan = buildDefaultTripFlightPlan({
      homeOriginIata: 'MXP',
      arrivalIata: 'NRT',
      departureIata: 'NRT',
      dateFrom: '2026-12-10',
      dateTo: null,
      passengers: 2,
      multiCountry: false,
      returnHome: false,
    });
    expect(plan.shape).toBe('oneway');
    expect(plan.legs).toHaveLength(1);
    expect(plan.legs[0]!.kind).toBe('outbound');
  });

  it('builds open-jaw with different return home airport', () => {
    const plan = buildDefaultTripFlightPlan({
      homeOriginIata: 'MXP',
      homeReturnIata: 'FCO',
      arrivalIata: 'BKK',
      departureIata: 'HKT',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      passengers: 1,
      multiCountry: false,
      returnHome: true,
    });
    expect(plan.shape).toBe('openjaw');
    expect(plan.legs[1]!.originIata).toBe('HKT');
    expect(plan.legs[1]!.destinationIata).toBe('FCO');
    expect(providerSearchModeForPlan(plan).canUseClosedRoundtrip).toBe(false);
  });

  it('includes internal legs when provided by itinerary', () => {
    const plan = buildDefaultTripFlightPlan({
      homeOriginIata: 'MXP',
      arrivalIata: 'HAN',
      departureIata: 'REP',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      passengers: 1,
      multiCountry: true,
      returnHome: true,
      internalLegs: [
        {
          originIata: 'SGN',
          destinationIata: 'REP',
          date: '2026-12-18',
          labelIt: 'Volo interno SGN → REP',
        },
      ],
    });
    expect(plan.legs.map((l) => l.kind)).toEqual([
      'outbound',
      'internal',
      'openjaw_return',
    ]);
  });

  it('flags stale outbound when dateFrom changes', () => {
    let plan = buildDefaultTripFlightPlan({
      homeOriginIata: 'MXP',
      arrivalIata: 'BKK',
      departureIata: 'BKK',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-20',
      passengers: 1,
      multiCountry: false,
    });
    plan = selectOfferOnLeg(plan, plan.legs[0]!.id, {
      offerId: 'o1',
      price: 400,
      currency: 'EUR',
      originIata: 'MXP',
      destinationIata: 'BKK',
      departureAt: '2026-12-10T10:00:00',
      arrivalAt: '2026-12-10T22:00:00',
      stops: 0,
      durationMinutes: 720,
      capturedAt: Date.now(),
    });
    const next = flagStaleLegs(plan, { dateFrom: '2026-12-11' });
    expect(next.legs[0]!.status).toBe('stale');
    expect(next.legs[1]!.status).toBe('empty');
  });

  it('detects same-day connection risk', () => {
    const plan = buildDefaultTripFlightPlan({
      homeOriginIata: 'MXP',
      arrivalIata: 'BKK',
      departureIata: 'BKK',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-10',
      passengers: 1,
      multiCountry: false,
    });
    const withOffers = {
      ...plan,
      legs: plan.legs.map((leg, i) => ({
        ...leg,
        offer: {
          offerId: `o${i}`,
          price: 100,
          currency: 'EUR',
          originIata: leg.originIata,
          destinationIata: leg.destinationIata,
          departureAt:
            i === 0 ? '2026-12-10T08:00:00Z' : '2026-12-10T09:00:00Z',
          arrivalAt:
            i === 0 ? '2026-12-10T08:30:00Z' : '2026-12-10T18:00:00Z',
          stops: 0,
          durationMinutes: 60,
          capturedAt: Date.now(),
        },
        status: 'selected' as const,
      })),
    };
    const issues = analyzeLegTiming(withOffers.legs);
    expect(issues.some((x) => /90 minuti|stretto/i.test(x.messageIt))).toBe(true);
  });

  it('sums selected leg prices', () => {
    let plan = buildDefaultTripFlightPlan({
      homeOriginIata: 'MXP',
      arrivalIata: 'BKK',
      departureIata: 'BKK',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-20',
      passengers: 1,
      multiCountry: false,
    });
    plan = selectOfferOnLeg(plan, plan.legs[0]!.id, {
      offerId: 'a',
      price: 300,
      currency: 'EUR',
      originIata: 'MXP',
      destinationIata: 'BKK',
      departureAt: '2026-12-10T10:00:00',
      arrivalAt: '2026-12-10T22:00:00',
      stops: 0,
      durationMinutes: 700,
      capturedAt: Date.now(),
    });
    plan = selectOfferOnLeg(plan, plan.legs[1]!.id, {
      offerId: 'b',
      price: 280,
      currency: 'EUR',
      originIata: 'BKK',
      destinationIata: 'MXP',
      departureAt: '2026-12-20T10:00:00',
      arrivalAt: '2026-12-20T18:00:00',
      stops: 0,
      durationMinutes: 700,
      capturedAt: Date.now(),
    });
    expect(selectedLegsTotal(plan).amount).toBe(580);
    expect(selectedLegsTotal(plan).selectedCount).toBe(2);
  });
});
