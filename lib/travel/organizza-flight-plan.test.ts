import { describe, expect, it } from 'vitest';
import { EMPTY_ORGANIZZA_DRAFT, patchOrganizzaDraft } from '@/lib/itineraries/organizza-steps';
import { combineMultiCountryPlan } from '@/lib/itineraries/multi-country';
import {
  buildDomesticPlanForDraft,
  buildMainFlightPlanForDraft,
  countMissingMainFlightLegs,
  flightPlanAllowsContinue,
  intercountryLegsFromMultiPlan,
  proposeDomesticLegsFromItinerary,
} from '@/lib/travel/organizza-flight-plan';
import { selectOfferOnLeg } from '@/lib/travel/trip-flight-legs';

describe('organizza-flight-plan (intercountry vs domestic)', () => {
  it('builds closed roundtrip without domestic on stage 2', () => {
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
    const plan = buildMainFlightPlanForDraft(draft, null);
    expect(plan.shape).toBe('roundtrip');
    expect(plan.legs.map((l) => l.kind)).toEqual(['outbound', 'return']);
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
    const plan = buildMainFlightPlanForDraft(draft, null);
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
    const plan = buildMainFlightPlanForDraft(draft, null);
    expect(plan.shape).toBe('openjaw');
    expect(plan.legs[1]?.destinationIata).toBe('FCO');
    expect(plan.legs[1]?.originIata).toBe('HKT');
  });

  it('VN+KH: intercountry SGN→REP on main plan, NOT as domestic', () => {
    const multi = combineMultiCountryPlan({
      slugs: ['vietnam', 'cambogia'],
      tripDays: 14,
    });
    expect(multi.ok).toBe(true);
    if (!multi.ok) return;
    const inter = intercountryLegsFromMultiPlan(multi, '2026-12-10', '2026-12-24');
    expect(inter[0]?.originIata).toBe('SGN');
    expect(inter[0]?.destinationIata).toBe('REP');
    expect(inter[0]?.labelIt).toMatch(/Tra paesi|SGN/i);

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
    const main = buildMainFlightPlanForDraft(draft, multi);
    expect(main.legs.map((l) => l.kind)).toEqual([
      'outbound',
      'intercountry',
      'openjaw_return',
    ]);
    expect(main.legs).toHaveLength(3);
    expect(main.legs.find((l) => l.kind === 'intercountry')?.labelIt).not.toMatch(
      /Domestico/i
    );
    expect(flightPlanAllowsContinue(main)).toBe(false);
    expect(countMissingMainFlightLegs(main)).toBe(3);
  });

  it('countMissingMainFlightLegs is 1 when plan is empty', () => {
    expect(countMissingMainFlightLegs(null)).toBe(1);
    expect(flightPlanAllowsContinue(null)).toBe(false);
  });

  it('3 countries → 4 main legs (outbound + 2 intercountry + return)', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'vietnam',
      slugs: ['vietnam', 'cambogia', 'thailandia'],
      arrivalIata: 'HAN',
      departureIata: 'BKK',
      dateFrom: '2026-12-01',
      dateTo: '2026-12-28',
      returnHome: true,
      originIata: 'MXP',
      homeReturnIata: 'MXP',
      travelers: 1,
    });
    const main = buildMainFlightPlanForDraft(draft, null);
    expect(main.legs).toHaveLength(4);
    expect(main.legs.map((l) => l.kind)).toEqual([
      'outbound',
      'intercountry',
      'intercountry',
      'openjaw_return',
    ]);
  });

  it('2 countries no-return → 2 main legs (outbound + intercountry)', () => {
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'vietnam',
      slugs: ['vietnam', 'cambogia'],
      arrivalIata: 'HAN',
      departureIata: 'REP',
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      returnHome: false,
      originIata: 'MXP',
      travelers: 1,
    });
    const main = buildMainFlightPlanForDraft(draft, null);
    expect(main.legs).toHaveLength(2);
    expect(main.legs.map((l) => l.kind)).toEqual(['outbound', 'intercountry']);
  });

  it('proposes domestic HAN→…→SGN only at itinerary after outbound selected', () => {
    const multi = combineMultiCountryPlan({
      slugs: ['vietnam', 'cambogia'],
      tripDays: 14,
    });
    if (!multi.ok) return;
    const draft = patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
      slug: 'vietnam',
      slugs: ['vietnam', 'cambogia'],
      arrivalIata: multi.arrivalIata,
      departureIata: multi.departureIata,
      dateFrom: '2026-12-10',
      dateTo: '2026-12-24',
      returnHome: true,
      originIata: 'MXP',
      travelers: 1,
    });
    let main = buildMainFlightPlanForDraft(draft, multi);
    const outId = main.legs.find((l) => l.kind === 'outbound')!.id;
    main = selectOfferOnLeg(main, outId, {
      offerId: 'ow1',
      price: 400,
      currency: 'EUR',
      originIata: 'MXP',
      destinationIata: 'HAN',
      departureAt: '2026-12-10T10:00:00',
      arrivalAt: '2026-12-10T22:00:00',
      stops: 1,
      durationMinutes: 700,
      capturedAt: Date.now(),
    });

    const domestic = proposeDomesticLegsFromItinerary({
      draft,
      multi,
      mainPlan: main,
    });
    expect(domestic.length).toBeGreaterThan(0);
    expect(domestic.some((d) => d.originIata === 'HAN' || d.destinationIata === 'SGN')).toBe(
      true
    );
    expect(domestic.every((d) => d.labelIt.startsWith('Domestico'))).toBe(true);

    const domPlan = buildDomesticPlanForDraft(draft, multi, main);
    expect(domPlan.legs.every((l) => l.kind === 'domestic')).toBe(true);
  });
});
