import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCheckoutDraftFromLegs } from '@/lib/itineraries/selected-flight-display';
import type { SelectedFlightPlanSnapshot } from '@/lib/itineraries/selected-flight-plan';
import {
  flightCheckoutChargeNow,
  flightCheckoutPlanTotal,
  loadFlightCheckoutDraft,
  saveFlightCheckoutDraft,
} from '@/lib/travel/flight-checkout-draft';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal('window', { sessionStorage });
  vi.stubGlobal('sessionStorage', sessionStorage);
}

const plan: SelectedFlightPlanSnapshot = {
  version: 2,
  travelers: 1,
  returnHome: true,
  savedAt: '2026-11-13T00:00:00.000Z',
  priceMode: 'unit',
  legs: [
    {
      id: 'out',
      kind: 'outbound',
      originIata: 'MXP',
      destinationIata: 'MAD',
      date: '2026-11-20',
      labelIt: 'MXP → MAD',
      offerId: 'offer-out-25',
      price: 25,
      currency: 'EUR',
      stops: 0,
      durationMinutes: 140,
      airline: 'Ryanair',
      departureAt: '2026-11-20T08:00:00.000Z',
      arrivalAt: '2026-11-20T10:20:00.000Z',
    },
    {
      id: 'ret',
      kind: 'return',
      originIata: 'MAD',
      destinationIata: 'MXP',
      date: '2026-11-26',
      labelIt: 'MAD → MXP',
      offerId: 'offer-ret-25',
      price: 25,
      currency: 'EUR',
      stops: 0,
      durationMinutes: 140,
      airline: 'Wizz',
      departureAt: '2026-11-26T18:00:00.000Z',
      arrivalAt: '2026-11-26T20:20:00.000Z',
    },
  ],
};

describe('multi-leg charge equals booked leg', () => {
  beforeEach(() => {
    stubSessionStorage();
  });

  it('charge now is 25 while plan total is 50 (incident case)', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan.legs,
      adults: 1,
      practiceId: 'd510151f-d61e-4f43-9471-52780971842f',
      mode: 'all',
    })!;
    expect(draft.offerId).toBe('offer-out-25');
    expect(flightCheckoutChargeNow(draft)).toBe(25);
    expect(flightCheckoutPlanTotal(draft)).toBe(50);
    expect(draft.price).toBe(25);
    expect(draft.price).not.toBe(flightCheckoutPlanTotal(draft));
  });

  it('after advancing to return, charge now switches to return offer', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan.legs,
      adults: 1,
      practiceId: 'p1',
      mode: 'all',
    })!;
    draft.activeLegIndex = 1;
    saveFlightCheckoutDraft(draft);
    const loaded = loadFlightCheckoutDraft()!;
    expect(loaded.offerId).toBe('offer-ret-25');
    expect(flightCheckoutChargeNow(loaded)).toBe(25);
    expect(flightCheckoutPlanTotal(loaded)).toBe(50);
    expect(loaded.price).toBe(25);
  });

  it('Pago per me with 2 pax charges only selected adults on active leg', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan.legs,
      adults: 1,
      practiceId: 'p1',
      mode: 'all',
    })!;
    expect(draft.adults).toBe(1);
    expect(draft.checkoutLegs?.[0]?.price).toBe(25);
    const forTwo = buildCheckoutDraftFromLegs({
      legs: plan.legs,
      adults: 2,
      practiceId: 'p1',
      mode: 'all',
    })!;
    expect(forTwo.price).toBe(50);
    expect(flightCheckoutPlanTotal(forTwo)).toBe(100);
  });
});
