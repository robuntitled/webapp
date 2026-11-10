/** Draft salvato in sessionStorage tra ricerca e checkout. */

export const FLIGHT_CHECKOUT_STORAGE_KEY = 'nomadlink.flightCheckout';

export type FlightLegDraft = {
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode?: string | null;
  airlineLogo?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
};

/** One purchasable one-way ticket in a multi-leg checkout. */
export type FlightCheckoutLegItem = {
  id: string;
  offerId: string;
  price: number;
  currency: string;
  kind: string;
  labelIt: string;
  leg: FlightLegDraft;
};

export type FlightCheckoutDraft = {
  offerId: string;
  price: number;
  currency: string;
  outbound: FlightLegDraft;
  returnLeg: FlightLegDraft | null;
  adults: number;
  tripType: 'oneway' | 'roundtrip';
  tripId?: string;
  practiceId?: string;
  createdAt: number;
  /**
   * Multi-leg checkout (Organizza / trip page).
   * Each item is a separate one-way LiteAPI offer; paid sequentially in one session.
   */
  checkoutLegs?: FlightCheckoutLegItem[];
  /** `all` = pay every selected unbooked leg; `separate` = single leg. */
  checkoutMode?: 'all' | 'separate';
  /** Index into checkoutLegs currently being prepaid/paid. */
  activeLegIndex?: number;
  /** @deprecated flat fields kept for older sessions */
  origin?: string;
  destination?: string;
  airline?: string | null;
  airlineCode?: string | null;
  airlineLogo?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number;
  cabinClass?: string | null;
  flightNumber?: string | null;
};

function normalizeDraft(parsed: FlightCheckoutDraft): FlightCheckoutDraft {
  const withOutbound = parsed.outbound
    ? parsed
    : {
        ...parsed,
        outbound: {
          origin: parsed.origin ?? '',
          destination: parsed.destination ?? '',
          airline: parsed.airline ?? null,
          airlineCode: parsed.airlineCode,
          airlineLogo: parsed.airlineLogo,
          departureAt: parsed.departureAt,
          arrivalAt: parsed.arrivalAt,
          durationMinutes: parsed.durationMinutes,
          stops: parsed.stops,
          flightNumber: parsed.flightNumber,
          cabinClass: parsed.cabinClass,
        },
        returnLeg: parsed.returnLeg ?? null,
      };

  const legs = withOutbound.checkoutLegs;
  if (!Array.isArray(legs) || legs.length === 0) return withOutbound;

  const idx = Math.min(
    Math.max(0, withOutbound.activeLegIndex ?? 0),
    legs.length - 1
  );
  const active = legs[idx]!;
  return {
    ...withOutbound,
    activeLegIndex: idx,
    offerId: active.offerId,
    outbound: active.leg,
    returnLeg: null,
    tripType: 'oneway',
    currency: active.currency || withOutbound.currency || 'EUR',
    // Keep total for the whole multi-leg scope on the draft; active charge uses payment.price.
    price:
      withOutbound.checkoutMode === 'separate'
        ? active.price
        : legs.reduce((s, l) => s + (Number.isFinite(l.price) ? l.price : 0), 0),
  };
}

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
    if (Date.now() - parsed.createdAt > 45 * 60 * 1000) {
      sessionStorage.removeItem(FLIGHT_CHECKOUT_STORAGE_KEY);
      return null;
    }
    return normalizeDraft(parsed);
  } catch {
    return null;
  }
}

export function clearFlightCheckoutDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(FLIGHT_CHECKOUT_STORAGE_KEY);
}

export const FLIGHT_PAYMENT_STORAGE_KEY = 'nomadlink.flightPayment';

export type FlightPaymentPending = {
  prebookId: string;
  transactionId: string;
  secretKey: string;
  paymentEnv: 'sandbox' | 'live';
  paymentMode: 'stripe_elements' | 'liteapi_sdk';
  publishableKey: string | null;
  price: number | null;
  currency: string | null;
  createdAt: number;
};

export function saveFlightPaymentPending(pending: FlightPaymentPending): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(FLIGHT_PAYMENT_STORAGE_KEY, JSON.stringify(pending));
}

export function loadFlightPaymentPending(): FlightPaymentPending | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FLIGHT_PAYMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FlightPaymentPending;
    if (!parsed?.prebookId || !parsed?.transactionId) return null;
    if (Date.now() - parsed.createdAt > 60 * 60 * 1000) {
      sessionStorage.removeItem(FLIGHT_PAYMENT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearFlightPaymentPending(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(FLIGHT_PAYMENT_STORAGE_KEY);
}
