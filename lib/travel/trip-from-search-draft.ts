/**
 * Bozza browser: offerta volo/hotel scelta → crea viaggio dopo login.
 * Evita di perdere la selezione durante la registrazione (Fase 1 / lancio.md).
 */

import type { FlightSearchSeed, HotelSearchSeed } from '@/lib/itineraries/from-search';
import type { FlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';
import type { HotelOfferDraft } from '@/lib/travel/hotel-offer-draft';

export const TRIP_FROM_SEARCH_KEY = 'nomadlink.tripFromSearch';

export type TripFromSearchDraft =
  | {
      kind: 'flight';
      seed: FlightSearchSeed;
      checkout: FlightCheckoutDraft;
      createdAt: number;
    }
  | {
      kind: 'hotel';
      seed: HotelSearchSeed;
      checkout: HotelOfferDraft;
      createdAt: number;
    };

export function saveTripFromSearchDraft(draft: TripFromSearchDraft): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TRIP_FROM_SEARCH_KEY, JSON.stringify(draft));
}

export function loadTripFromSearchDraft(): TripFromSearchDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TRIP_FROM_SEARCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TripFromSearchDraft;
    if (!parsed?.kind || !parsed.createdAt) return null;
    if (Date.now() - parsed.createdAt > 60 * 60 * 1000) {
      sessionStorage.removeItem(TRIP_FROM_SEARCH_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTripFromSearchDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TRIP_FROM_SEARCH_KEY);
}
