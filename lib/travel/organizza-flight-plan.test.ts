import { describe, expect, it } from 'vitest';
import { EMPTY_ORGANIZZA_DRAFT, patchOrganizzaDraft } from '@/lib/itineraries/organizza-steps';
import { combineMultiCountryPlan } from '@/lib/itineraries/multi-country';
import {
  buildFlightPlanForDraft,
  flightPlanAllowsContinue,
  internalLegsFromMultiPlan,
} from '@/lib/travel/organizza-flight-plan';

describe('organizza-flight-plan', () => {
  it('builds closed roundtrip by default', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      originIata: 'MXP',
      homeReturnIata: 'MXP',
      arrivalIata: 'BKK',
      departureIata: 'BKK',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      returnHome: true,
      travelers: 1,
    });
    const plan = buildFlightPlanForDraft(draft, null);
    expect(plan.shape).toBe('roundtrip');
    expect(plan.legs).toHaveLength(2);
  });

  it('omits return when returnHome false', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'giappone',
      originIata: 'MXP',
      arrivalIata: 'NRT',
      departureIata: 'NRT',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      returnHome: false,
    });
    const plan = buildFlightPlanForDraft(draft, null);
    expect(plan.shape).toBe('oneway');
    expect(plan.legs).toHaveLength(1);
  });

  it('open-jaw home return airport', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'thailandia',
      originIata: 'MXP',
      homeReturnIata: 'FCO',
      arrivalIata: 'BKK',
      departureIata: 'HKT',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      returnHome: true,
    });
    const plan = buildFlightPlanForDraft(draft, null);
    expect(plan.shape).toBe('openjaw');
    expect(plan.legs[1]?.destinationIata).toBe('FCO');
    expect(plan.legs[1]?.originIata).toBe('HKT');
  });

  it('adds internal SGN→REP for Vietnam+Cambodia', () => {
    const multi = combineMultiCountryPlan({
      slugs: ['vietnam', 'cambogia'],
      tripDays: 14,
    });
    expect(multi.ok).toBe(true);
    if (!multi.ok) return;
    const internals = internalLegsFromMultiPlan(multi, '2026-12-10', '2026-12-24');
    expect(internals[0]?.originIata).toBe('SGN');
    expect(internals[0]?.destinationIata).toBe('REP');

    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'vietnam',
      slugs: ['vietnam', 'cambogia'],
      arrivalIata: multi.arrivalIata,
      departureIata: multi.departureIata,
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      returnHome: true,
      originIata: 'MXP',
    });
    const plan = buildFlightPlanForDraft(draft, multi);
    expect(plan.legs.map((l) => l.kind)).toEqual([
      'outbound',
      'internal',
      'openjaw_return',
    ]);
    expect(flightPlanAllowsContinue(plan)).toBe(false);
  });
});
