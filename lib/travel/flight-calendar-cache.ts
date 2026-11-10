/**
 * Client/server-safe cache for calendar day probes (few hours).
 */

export type CalendarProbeResult = {
  date: string;
  cheapestPrice: number | null;
  minStops: number | null;
  minDurationMinutes: number | null;
  offerCount: number;
  /** ok | empty | error — never cache raw provider errors as success. */
  status: 'ok' | 'empty' | 'error';
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
  // v2: chip stats from a single cheapest offer (not independent mins).
  return [
    'v2',
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
  // Never reuse hard errors — allow retry.
  if (hit.status === 'error') {
    memory.delete(key);
    return null;
  }
  return hit;
}

export function writeCalendarCache(
  key: string,
  value: Omit<CalendarProbeResult, 'fetchedAt'> & { fetchedAt?: number }
) {
  if (value.status === 'error') return null;
  const row: CalendarProbeResult = {
    ...value,
    fetchedAt: value.fetchedAt ?? Date.now(),
  };
  memory.set(key, row);
  return row;
}

/**
 * API budget for one date-focus probe window.
 * ±2 (5 days) is more reliable on long-haul than ±3 (7): each probe is 20–45s
 * and full offer payloads were starving the queue on mobile.
 */
export const FLIGHT_CALENDAR_API_BUDGET = {
  radiusDays: 2,
  probesPerFocus: 5,
  /** Outbound + return focus. */
  maxProbesPerFullSelection: 10,
  cacheTtlHours: 3,
  /** Shared across both calendars on the page. */
  concurrency: 2,
  friendlyNoteIt:
    'Ti mostriamo anche i giorni vicini se conviene partire un giorno prima o dopo.',
  /** Honest ops note (not shown in UI). */
  opsNoteIt:
    'Calendario: fino a 5 ricerche per focus (±2). Cache 3 ore. Concorrenza 2 condivisa. Long-haul 20–45 s/chiamata; summary JSON only.',
} as const;
