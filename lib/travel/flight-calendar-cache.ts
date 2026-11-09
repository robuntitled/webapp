/**
 * Client/server-safe cache for calendar day probes (few hours).
 */

export type CalendarProbeResult = {
  date: string;
  cheapestPrice: number | null;
  minStops: number | null;
  minDurationMinutes: number | null;
  offerCount: number;
  fetchedAt: number;
};

const TTL_MS = 3 * 60 * 60 * 1000;
const memory = new Map<string, CalendarProbeResult>();

export function calendarCacheKey(input: {
  origin: string;
  destination: string;
  date: string;
  tripType: 'oneway' | 'roundtrip';
  returnDate?: string | null;
}): string {
  return [
    input.origin.trim().toUpperCase(),
    input.destination.trim().toUpperCase(),
    input.date,
    input.tripType,
    input.returnDate ?? '',
  ].join('|');
}

export function readCalendarCache(key: string): CalendarProbeResult | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > TTL_MS) {
    memory.delete(key);
    return null;
  }
  return hit;
}

export function writeCalendarCache(key: string, value: Omit<CalendarProbeResult, 'fetchedAt'> & { fetchedAt?: number }) {
  const row: CalendarProbeResult = {
    ...value,
    fetchedAt: value.fetchedAt ?? Date.now(),
  };
  memory.set(key, row);
  return row;
}

/** Documented API budget for one date-focus probe window. */
export const FLIGHT_CALENDAR_API_BUDGET = {
  radiusDays: 3,
  probesPerFocus: 7,
  /** Outbound + return focus = 14 probes; ×2 if country fans out to 2 hubs. */
  maxProbesPerFullSelection: 28,
  cacheTtlHours: 3,
  concurrency: 2,
  noteIt:
    'Calendario: fino a 7 ricerche per la partenza (±3 giorni) e 7 per il ritorno. Cache 3 ore. Concorrenza 2. Tratte lunghe 20–45 s a chiamata.',
} as const;
