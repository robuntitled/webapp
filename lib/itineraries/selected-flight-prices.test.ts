import { describe, expect, it } from 'vitest';
import {
  buildCheckoutDraftFromLegs,
  selectedLegChargeForPax,
  selectedLegPerPersonPrice,
  sumSelectedLegsChargeForPax,
  sumSelectedLegsPerPerson,
  sumSelectedPlanPerPerson,
} from '@/lib/itineraries/selected-flight-display';
import type { SelectedFlightPlanSnapshot } from '@/lib/itineraries/selected-flight-plan';

/** Mirrors Organizza: 2 pax → stored prices are party totals (408×2, 478×2). */
const plan2pax: SelectedFlightPlanSnapshot = {
  version: 1,
  travelers: 2,
  returnHome: true,
  savedAt: '2026-11-11T00:00:00.000Z',
  legs: [
    {
      id: 'out',
      kind: 'outbound',
      originIata: 'MXP',
      destinationIata: 'BKK',
      date: '2026-12-01',
      labelIt: 'MXP → BKK',
      offerId: 'off-out',
      price: 815,
      currency: 'EUR',
      stops: 1,
      durationMinutes: 700,
      airline: 'Emirates',
      departureAt: '2026-12-01T10:00:00.000Z',
      arrivalAt: '2026-12-02T06:00:00.000Z',
    },
    {
      id: 'ret',
      kind: 'return',
      originIata: 'BKK',
      destinationIata: 'MXP',
      date: '2026-12-15',
      labelIt: 'BKK → MXP',
      offerId: 'off-ret',
      price: 955,
      currency: 'EUR',
      stops: 1,
      durationMinutes: 720,
      airline: 'Emirates',
      departureAt: '2026-12-15T08:00:00.000Z',
      arrivalAt: '2026-12-15T18:00:00.000Z',
    },
  ],
};

describe('selected flight prices (party total vs a persona)', () => {
  it('derives per-person from stored party totals', () => {
    expect(selectedLegPerPersonPrice(plan2pax.legs[0]!, 2)).toBe(407.5);
    expect(selectedLegPerPersonPrice(plan2pax.legs[1]!, 2)).toBe(477.5);
    expect(sumSelectedPlanPerPerson(plan2pax)).toBe(885);
  });

  it('Pago per me charges one seat (not the full party total)', () => {
    expect(sumSelectedLegsChargeForPax(plan2pax.legs, 2, 1)).toBe(885);
    expect(sumSelectedLegsPerPerson(plan2pax.legs, 2)).toBe(885);
  });

  it('Pago per altri for 2 selected equals the stored party totals', () => {
    expect(sumSelectedLegsChargeForPax(plan2pax.legs, 2, 2)).toBe(1770);
    expect(selectedLegChargeForPax(plan2pax.legs[0]!, 2, 2)).toBe(815);
  });

  it('checkout draft for 1 adult does not double party totals', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan2pax.legs,
      adults: 1,
      practiceId: 'p1',
      mode: 'all',
      priceBasisTravelers: 2,
    });
    expect(draft?.adults).toBe(1);
    expect(draft?.price).toBe(885);
    expect(draft?.checkoutLegs?.[0]?.price).toBe(407.5);
    expect(draft?.checkoutLegs?.[1]?.price).toBe(477.5);
  });

  it('checkout draft for full party equals stored totals (no double multiply)', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan2pax.legs,
      adults: 2,
      practiceId: 'p1',
      mode: 'all',
      priceBasisTravelers: 2,
    });
    expect(draft?.price).toBe(1770);
    expect(draft?.checkoutLegs?.[0]?.price).toBe(815);
    expect(draft?.checkoutLegs?.[1]?.price).toBe(955);
  });

  it('travelers=1 keeps legacy per-person storage working', () => {
    const solo: SelectedFlightPlanSnapshot = {
      ...plan2pax,
      travelers: 1,
      legs: plan2pax.legs.map((l) => ({
        ...l,
        price: l.id === 'out' ? 408 : 478,
      })),
    };
    expect(sumSelectedPlanPerPerson(solo)).toBe(886);
    const draft = buildCheckoutDraftFromLegs({
      legs: solo.legs,
      adults: 1,
      practiceId: 'p1',
      mode: 'all',
      priceBasisTravelers: 1,
    });
    expect(draft?.price).toBe(886);
  });
});
