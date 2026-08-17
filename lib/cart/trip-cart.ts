export type TripCartKind =
  | 'flight'
  | 'hotel'
  | 'activity'
  | 'attraction'
  | 'car'
  | 'transfer';

export type TripCartItem = {
  id: string;
  kind: TripCartKind;
  title: string;
  subtitle?: string;
  price?: number | null;
  currency?: string;
  checkoutHref: string;
  provider: string;
};

export type TripCart = {
  v: 1;
  tripId: string;
  items: TripCartItem[];
};

const storageKey = (tripId: string) => `nl-trip-cart-v1:${tripId}`;

export const CART_KIND_LABEL: Record<TripCartKind, string> = {
  flight: 'Volo',
  hotel: 'Hotel',
  activity: 'Attività',
  attraction: 'Attrazione',
  car: 'Auto',
  transfer: 'Transfer',
};

export function emptyTripCart(tripId: string): TripCart {
  return { v: 1, tripId, items: [] };
}

export function readTripCart(tripId: string): TripCart {
  if (typeof window === 'undefined') return emptyTripCart(tripId);
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (!raw) return emptyTripCart(tripId);
    const parsed = JSON.parse(raw) as TripCart;
    if (parsed?.v !== 1 || parsed.tripId !== tripId || !Array.isArray(parsed.items)) {
      return emptyTripCart(tripId);
    }
    return parsed;
  } catch {
    return emptyTripCart(tripId);
  }
}

export function writeTripCart(cart: TripCart): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(cart.tripId), JSON.stringify(cart));
}

export function addCartItem(tripId: string, item: TripCartItem): TripCart {
  const cart = readTripCart(tripId);
  if (cart.items.some((i) => i.id === item.id)) return cart;
  const next = { ...cart, items: [...cart.items, item] };
  writeTripCart(next);
  return next;
}

export function removeCartItem(tripId: string, itemId: string): TripCart {
  const cart = readTripCart(tripId);
  const next = { ...cart, items: cart.items.filter((i) => i.id !== itemId) };
  writeTripCart(next);
  return next;
}

export function cartTotal(cart: TripCart): number {
  return cart.items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : 0), 0);
}
