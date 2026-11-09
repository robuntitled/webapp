/**
 * Shared client-side concurrency gate for calendar day probes.
 * Departure + return calendars share one pool so mobile doesn't stampede.
 */

import { FLIGHT_CALENDAR_API_BUDGET } from '@/lib/travel/flight-calendar-cache';

let active = 0;
const waiters: Array<() => void> = [];

export async function withCalendarProbeSlot<T>(fn: () => Promise<T>): Promise<T> {
  const limit = FLIGHT_CALENDAR_API_BUDGET.concurrency;
  while (active >= limit) {
    await new Promise<void>((resolve) => {
      waiters.push(resolve);
    });
  }
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    const next = waiters.shift();
    next?.();
  }
}
