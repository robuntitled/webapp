/**
 * Bookable date helpers for Organizza smart calendar.
 * Rome calendar day — no past probes (provider rejects them → 502).
 */

const ROME = 'Europe/Rome';

/** Minimum nights from today before departure (provider + practical lead). */
export const MIN_DEPARTURE_LEAD_DAYS = 2;

export function todayIsoInRome(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ROME,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(y!, m! - 1, d!) + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Earliest selectable departure date (today + lead). */
export function minBookableDateIso(now = new Date()): string {
  return addDaysIso(todayIsoInRome(now), MIN_DEPARTURE_LEAD_DAYS);
}

/**
 * ±radius around center, never before minDate.
 * If trimming removes days, extend forward to keep target length when possible.
 */
export function bookableNearbyWindow(
  centerIso: string,
  opts?: { radiusDays?: number; minDate?: string; targetCount?: number }
): string[] {
  const radius = opts?.radiusDays ?? 2;
  const minDate = opts?.minDate ?? minBookableDateIso();
  const target = opts?.targetCount ?? radius * 2 + 1;
  const center = centerIso < minDate ? minDate : centerIso;

  const raw: string[] = [];
  for (let i = -radius; i <= radius; i++) {
    raw.push(addDaysIso(center, i));
  }
  let out = raw.filter((d) => d >= minDate);
  let guard = 0;
  while (out.length < target && guard < 14) {
    const next = addDaysIso(out[out.length - 1] ?? center, 1);
    if (!out.includes(next)) out.push(next);
    guard += 1;
  }
  out = [...new Set(out)].sort();
  return out;
}

/** Probe order: selected first, then nearest neighbors. */
export function prioritizeProbeOrder(dates: string[], selected: string): string[] {
  return [...dates].sort((a, b) => {
    if (a === selected) return -1;
    if (b === selected) return 1;
    return Math.abs(Date.parse(a) - Date.parse(selected)) - Math.abs(Date.parse(b) - Date.parse(selected));
  });
}
