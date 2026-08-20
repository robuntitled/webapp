import type { FlightLayover } from '@/lib/liteapi/flight-layovers';

export type FlightValueInput = {
  price: number;
  durationMinutes: number | null;
  stops: number;
  layovers?: FlightLayover[];
};

/**
 * Costo “vero” di un volo: prezzo + tempo + scali lunghi.
 * ATH–DXB a 132€ in 16h perde contro un diretto a 200€ in 5h.
 */
export function flightValueScore(o: FlightValueInput): number {
  const hours = Math.max(0, (o.durationMinutes ?? 10 * 60) / 60);
  const stops = Math.max(0, o.stops ?? 0);
  const longWait = (o.layovers ?? []).reduce((sum, l) => {
    const waitH = (l.waitMinutes ?? 0) / 60;
    return sum + (waitH >= 6 ? (waitH - 5) * 32 : 0);
  }, 0);
  return o.price + hours * 20 + stops * 42 + longWait;
}

export function isBrutalItinerary(o: FlightValueInput, fastestMinutes: number): boolean {
  const dur = o.durationMinutes ?? fastestMinutes;
  if ((o.stops ?? 0) >= 3) return true;
  if ((o.layovers ?? []).some((l) => (l.waitMinutes ?? 0) >= 10 * 60)) return true;
  if (fastestMinutes > 0 && dur >= fastestMinutes * 2.3 && dur >= fastestMinutes + 5 * 60) {
    return true;
  }
  return false;
}

export function pickSensibleOffer<T extends FlightValueInput>(offers: T[]): T | null {
  if (!offers.length) return null;
  const durations = offers
    .map((o) => o.durationMinutes)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const fastest = durations.length ? Math.min(...durations) : 0;
  const usable = offers.filter((o) => !isBrutalItinerary(o, fastest));
  const pool = usable.length ? usable : offers;
  return [...pool].sort(
    (a, b) => flightValueScore(a) - flightValueScore(b) || a.price - b.price
  )[0];
}
