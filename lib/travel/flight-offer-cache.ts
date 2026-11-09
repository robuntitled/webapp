/**
 * In-memory + sessionStorage cache for LiteAPI flight offer searches.
 * Bounded TTL; never invents offers. Dedupes identical query keys.
 */

export type CachedFlightOffer = {
  id: string;
  price: number;
  currency?: string;
  stops: number;
  durationMinutes: number;
  origin?: string;
  destination?: string;
  departureAt?: string;
  arrivalAt?: string;
  returnDepartureAt?: string;
  returnArrivalAt?: string;
  airline?: string | null;
};

export type FlightOfferCacheEntry = {
  offers: CachedFlightOffer[];
  fetchedAt: number;
  status: 'ok' | 'empty';
};

const TTL_MS = 20 * 60 * 1000;
const memory = new Map<string, FlightOfferCacheEntry>();
const STORAGE_KEY = 'nl-flight-offer-cache-v1';
const MAX_KEYS = 40;

export function flightOfferCacheKey(input: {
  origin: string;
  destination: string;
  date: string;
  tripType: 'oneway' | 'roundtrip';
  returnDate?: string | null;
  adults: number;
}): string {
  return [
    input.origin.trim().toUpperCase(),
    input.destination.trim().toUpperCase(),
    input.date,
    input.tripType,
    input.returnDate ?? '',
    String(input.adults),
  ].join('|');
}

function loadSession(): void {
  if (typeof window === 'undefined' || memory.size > 0) return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, FlightOfferCacheEntry>;
    for (const [k, v] of Object.entries(parsed)) {
      if (v && Date.now() - v.fetchedAt < TTL_MS) memory.set(k, v);
    }
  } catch {
    /* ignore */
  }
}

function persistSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, FlightOfferCacheEntry> = {};
    let n = 0;
    for (const [k, v] of memory) {
      if (n >= MAX_KEYS) break;
      if (Date.now() - v.fetchedAt < TTL_MS) {
        obj[k] = v;
        n += 1;
      }
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function readFlightOfferCache(key: string): FlightOfferCacheEntry | null {
  loadSession();
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > TTL_MS) {
    memory.delete(key);
    return null;
  }
  return hit;
}

export function writeFlightOfferCache(
  key: string,
  offers: CachedFlightOffer[]
): FlightOfferCacheEntry {
  loadSession();
  const entry: FlightOfferCacheEntry = {
    offers,
    fetchedAt: Date.now(),
    status: offers.length > 0 ? 'ok' : 'empty',
  };
  memory.set(key, entry);
  if (memory.size > MAX_KEYS) {
    const oldest = [...memory.entries()].sort(
      (a, b) => a[1].fetchedAt - b[1].fetchedAt
    )[0];
    if (oldest) memory.delete(oldest[0]);
  }
  persistSession();
  return entry;
}

/** In-flight request dedupe. */
const inflight = new Map<string, Promise<CachedFlightOffer[]>>();

export function getInflightOfferSearch(
  key: string
): Promise<CachedFlightOffer[]> | undefined {
  return inflight.get(key);
}

export function setInflightOfferSearch(
  key: string,
  promise: Promise<CachedFlightOffer[]>
): void {
  inflight.set(key, promise);
  void promise.finally(() => {
    inflight.delete(key);
  });
}
