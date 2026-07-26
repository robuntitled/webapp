/** Draft salvato in sessionStorage tra ricerca e checkout. */

export const FLIGHT_CHECKOUT_STORAGE_KEY = 'nomadlink.flightCheckout';

export type FlightCheckoutDraft = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode?: string | null;
  airlineLogo?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number;
  cabinClass?: string | null;
  flightNumber?: string | null;
  adults: number;
  tripType: 'oneway' | 'roundtrip';
  createdAt: number;
};

export function saveFlightCheckoutDraft(draft: FlightCheckoutDraft): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(FLIGHT_CHECKOUT_STORAGE_KEY, JSON.stringify(draft));
}

export function loadFlightCheckoutDraft(): FlightCheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FLIGHT_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FlightCheckoutDraft;
    if (!parsed?.offerId || typeof parsed.price !== 'number') return null;
    // Scadenza soft 45 minuti
    if (Date.now() - parsed.createdAt > 45 * 60 * 1000) {
      sessionStorage.removeItem(FLIGHT_CHECKOUT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearFlightCheckoutDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(FLIGHT_CHECKOUT_STORAGE_KEY);
}
