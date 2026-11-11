import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';
import {
  buildCheckoutDraftFromLegs,
  findBookingForSelectedLeg,
  isSelectedLegBooked,
  sumSelectedLegsPerPerson,
} from '@/lib/itineraries/selected-flight-display';
import {
  purchasableLegsFromSelected,
  type SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';
import { loadFlightCheckoutDraft, saveFlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';

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
  // draft helpers gate on `typeof window !== 'undefined'`
  vi.stubGlobal('window', { sessionStorage });
  vi.stubGlobal('sessionStorage', sessionStorage);
  return store;
}

const plan: SelectedFlightPlanSnapshot = {
  version: 1,
  travelers: 1,
  returnHome: true,
  savedAt: '2026-11-10T00:00:00.000Z',
  legs: [
    {
      id: 'out',
      kind: 'outbound',
      originIata: 'MXP',
      destinationIata: 'KEF',
      date: '2026-11-13',
      labelIt: 'MXP → KEF',
      offerId: 'offer-out',
      price: 50,
      currency: 'EUR',
      stops: 0,
      durationMinutes: 280,
      airline: 'Wizz Air Malta',
      departureAt: '2026-11-13T06:10:00.000Z',
      arrivalAt: '2026-11-13T09:50:00.000Z',
    },
    {
      id: 'ret',
      kind: 'return',
      originIata: 'KEF',
      destinationIata: 'MXP',
      date: '2026-11-18',
      labelIt: 'KEF → MXP',
      offerId: 'offer-ret',
      price: 57,
      currency: 'EUR',
      stops: 0,
      durationMinutes: 250,
      airline: 'Wizz Air Malta',
      departureAt: '2026-11-18T10:30:00.000Z',
      arrivalAt: '2026-11-18T15:40:00.000Z',
    },
  ],
};

const outboundBooking: FlightBookingRecap = {
  bookingId: '01a1',
  bookingRef: 'FH-26B-EXLXFJUQ',
  status: 'CREATED',
  amountEur: 50,
  currency: 'EUR',
  outbound: {
    origin: 'MXP',
    destination: 'KEF',
    airline: 'Wizz Air Malta',
    departureAt: '2026-11-13T06:10:00.000Z',
    arrivalAt: '2026-11-13T09:50:00.000Z',
  },
  returnLeg: null,
  bookedAt: '2026-11-10T00:00:00.000Z',
};

describe('multi-leg checkout helpers', () => {
  beforeEach(() => {
    stubSessionStorage();
  });

  it('lists all purchasable legs (not only the first)', () => {
    expect(purchasableLegsFromSelected(plan)).toHaveLength(2);
    expect(sumSelectedLegsPerPerson(plan.legs, plan.travelers)).toBe(107);
  });

  it('builds a draft with every selected leg and total', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan.legs,
      adults: 1,
      practiceId: 'prac-1',
      mode: 'all',
      priceBasisTravelers: plan.travelers,
    });
    expect(draft?.checkoutLegs).toHaveLength(2);
    expect(draft?.price).toBe(107);
    expect(draft?.checkoutMode).toBe('all');
    expect(draft?.checkoutLegs?.[0]?.offerId).toBe('offer-out');
    expect(draft?.checkoutLegs?.[1]?.offerId).toBe('offer-ret');
  });

  it('scales prices by adults for group checkout', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan.legs,
      adults: 2,
      practiceId: 'prac-1',
      mode: 'all',
      priceBasisTravelers: plan.travelers,
    });
    expect(draft?.price).toBe(214);
    expect(draft?.checkoutLegs?.[0]?.price).toBe(100);
    expect(draft?.checkoutLegs?.[1]?.price).toBe(114);
  });

  it('matches booked outbound and leaves return as unbooked', () => {
    expect(isSelectedLegBooked(plan.legs[0]!, [outboundBooking])).toBe(true);
    expect(isSelectedLegBooked(plan.legs[1]!, [outboundBooking])).toBe(false);
    expect(findBookingForSelectedLeg(plan.legs[0]!, [outboundBooking])?.bookingRef).toBe(
      'FH-26B-EXLXFJUQ'
    );
  });

  it('normalizes active leg from checkoutLegs when loading draft', () => {
    const draft = buildCheckoutDraftFromLegs({
      legs: plan.legs,
      adults: 1,
      practiceId: 'prac-1',
      mode: 'all',
      priceBasisTravelers: plan.travelers,
    })!;
    draft.activeLegIndex = 1;
    saveFlightCheckoutDraft(draft);
    const loaded = loadFlightCheckoutDraft();
    expect(loaded?.offerId).toBe('offer-ret');
    expect(loaded?.outbound.origin).toBe('KEF');
    expect(loaded?.checkoutLegs).toHaveLength(2);
    expect(loaded?.price).toBe(107);
  });
});
