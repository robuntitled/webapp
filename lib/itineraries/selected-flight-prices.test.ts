import { describe, expect, it } from 'vitest';
import {
  buildCheckoutDraftFromLegs,
  selectedLegChargeForPax,
  selectedLegPartyTotal,
  selectedLegPerPersonPrice,
  sumSelectedLegsChargeForPax,
  sumSelectedLegsPerPerson,
  sumSelectedPlanPerPerson,
} from '@/lib/itineraries/selected-flight-display';
import {
  normalizeSelectedFlightPlan,
  type SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';

/** Canonical SoT: prices are unit (a persona). */
const plan4pax: SelectedFlightPlanSnapshot = {
  version: 2,
  travelers: 4,
  returnHome: true,
  savedAt: '2026-11-11T00:00:00.000Z',
  priceMode: 'unit',
  legs: [
    {
      id: 'out',
      kind: 'outbound',
      originIata: 'MXP',
      destinationIata: 'IST',
      date: '2026-11-16',
      labelIt: 'MXP → IST',
      offerId: 'off-out',
      price: 110,
      currency: 'EUR',
      stops: 1,
      durationMinutes: 370,
      airline: 'Air Serbia',
      departureAt: '2026-11-16T20:30:00.000Z',
      arrivalAt: '2026-11-17T04:40:00.000Z',
    },
    {
      id: 'ret',
      kind: 'return',
      originIata: 'IST',
      destinationIata: 'MXP',
      date: '2026-11-28',
      labelIt: 'IST → MXP',
      offerId: 'off-ret',
      price: 102.5,
      currency: 'EUR',
      stops: 1,
      durationMinutes: 440,
      airline: 'Sky Express',
      departureAt: '2026-11-28T10:30:00.000Z',
      arrivalAt: '2026-11-28T15:50:00.000Z',
    },
  ],
};

describe('selected flight prices (unit a persona SoT)', () => {
  it('1/2/4 pax: a persona stays 110; totale = unit × travelers', () => {
    for (const pax of [1, 2, 4] as const) {
      expect(selectedLegPerPersonPrice(plan4pax.legs[0]!, pax)).toBe(110);
      expect(selectedLegPartyTotal(plan4pax.legs[0]!, pax)).toBe(110 * pax);
    }
    expect(selectedLegPartyTotal(plan4pax.legs[0]!, 4)).toBe(440);
    expect(selectedLegPartyTotal(plan4pax.legs[1]!, 4)).toBe(410);
  });

  it('does not divide an already-per-person price (Modifica volo regression)', () => {
    // Stored 110 after edit with adults=1 — must NOT become 27.
    expect(selectedLegPerPersonPrice({ price: 110 }, 4)).toBe(110);
    expect(selectedLegPartyTotal({ price: 110 }, 4)).toBe(440);
  });

  it('Pago per me charges one seat', () => {
    expect(sumSelectedLegsChargeForPax(plan4pax.legs, 4, 1)).toBe(212.5);
    expect(sumSelectedLegsPerPerson(plan4pax.legs, 4)).toBe(212.5);
    expect(selectedLegChargeForPax(plan4pax.legs[0]!, 4, 1)).toBe(110);
  });

  it('Pago per altri for 4 = unit × 4', () => {
    expect(sumSelectedLegsChargeForPax(plan4pax.legs, 4, 4)).toBe(850);
    expect(selectedLegChargeForPax(plan4pax.legs[0]!, 4, 4)).toBe(440);
  });

  it('checkout draft for 1 adult uses unit prices; draft.price = first leg', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan4pax.legs,
      adults: 1,
      practiceId: 'p1',
      mode: 'separate',
      priceBasisTravelers: 4,
    });
    expect(draft?.adults).toBe(1);
    expect(draft?.price).toBe(110);
    expect(draft?.checkoutLegs?.[0]?.price).toBe(110);
    expect(draft?.checkoutLegs?.[1]?.price).toBe(102.5);
  });

  it('checkout draft for 4 adults = unit × 4 (LiteAPI amount)', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: [plan4pax.legs[0]!],
      adults: 4,
      practiceId: 'p1',
      mode: 'separate',
      priceBasisTravelers: 4,
    });
    expect(draft?.price).toBe(440);
    expect(draft?.checkoutLegs?.[0]?.price).toBe(440);
  });

  it('sumSelectedPlanPerPerson matches calendar/Selezionato', () => {
    expect(sumSelectedPlanPerPerson(plan4pax)).toBe(212.5);
  });

  it('normalize converts explicit party totals to unit', () => {
    const legacy: SelectedFlightPlanSnapshot = {
      version: 1,
      travelers: 4,
      returnHome: true,
      savedAt: '2026-11-01T00:00:00.000Z',
      priceMode: 'party',
      legs: [{ ...plan4pax.legs[0]!, price: 440 }],
    };
    const n = normalizeSelectedFlightPlan(legacy);
    expect(n.priceMode).toBe('unit');
    expect(n.version).toBe(2);
    expect(n.legs[0]!.price).toBe(110);
  });

  it('normalize leaves ambiguous v1 (post-Modifica unit) unchanged', () => {
    const ambiguous: SelectedFlightPlanSnapshot = {
      version: 1,
      travelers: 4,
      returnHome: true,
      savedAt: '2026-11-11T00:00:00.000Z',
      legs: [{ ...plan4pax.legs[0]!, price: 110 }],
    };
    const n = normalizeSelectedFlightPlan(ambiguous);
    expect(n.legs[0]!.price).toBe(110);
    expect(n.priceMode).toBe('unit');
  });
});
