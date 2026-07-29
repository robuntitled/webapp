/**
 * Bozza offerta hotel + pending payment (sessionStorage).
 */

const OFFER_KEY = 'nomadlink.hotel.offerDraft';
const PAYMENT_KEY = 'nomadlink.hotel.payment';

export type HotelOfferDraft = {
  hotelId: string;
  name: string;
  address: string | null;
  city: string | null;
  photo: string | null;
  stars: number | null;
  rating: number | null;
  roomName: string;
  boardName: string | null;
  offerId: string;
  totalAmount: number;
  currency: string;
  freeCancellation: boolean;
  checkin: string;
  checkout: string;
  adults: number;
  childrenAges?: number[];
  savedAt: number;
};

export type HotelPaymentPending = {
  prebookId: string;
  transactionId: string;
  secretKey: string;
  paymentEnv: 'sandbox' | 'live';
  paymentMode: 'stripe_elements' | 'liteapi_sdk';
  publishableKey: string | null;
  price: number | null;
  currency: string | null;
  holder: {
    firstName: string;
    lastName: string;
    email: string;
  };
  guest: {
    firstName: string;
    lastName: string;
  };
  createdAt: number;
};

export function saveHotelOfferDraft(draft: HotelOfferDraft): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(OFFER_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function loadHotelOfferDraft(): HotelOfferDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(OFFER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HotelOfferDraft;
    if (!parsed?.offerId) return null;
    if (Date.now() - parsed.savedAt > 45 * 60 * 1000) {
      sessionStorage.removeItem(OFFER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearHotelOfferDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(OFFER_KEY);
}

export function saveHotelPaymentPending(pending: HotelPaymentPending): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PAYMENT_KEY, JSON.stringify(pending));
}

export function loadHotelPaymentPending(): HotelPaymentPending | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PAYMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HotelPaymentPending;
    if (!parsed?.prebookId || !parsed?.transactionId) return null;
    if (Date.now() - parsed.createdAt > 60 * 60 * 1000) {
      sessionStorage.removeItem(PAYMENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearHotelPaymentPending(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PAYMENT_KEY);
}
