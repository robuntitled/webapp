/**
 * Trip length convention (Organizza / masters):
 * - `tripDays` = calendar days inclusive (arrival → departure)
 * - nights = tripDays - 1
 * Example: 10–19 nov = 10 giorni / 9 notti; 10–20 nov = 11 giorni / 10 notti.
 */

export function nightsFromTripDays(tripDays: number): number {
  if (!Number.isFinite(tripDays) || tripDays < 1) return 0;
  return Math.max(0, Math.floor(tripDays) - 1);
}

/** Italian label: «11 giorni · 10 notti». */
export function tripDurationLabelIt(tripDays: number): string {
  const days = Math.max(1, Math.floor(tripDays));
  const nights = nightsFromTripDays(days);
  const d = days === 1 ? '1 giorno' : `${days} giorni`;
  const n = nights === 1 ? '1 notte' : `${nights} notti`;
  return `${d} · ${n}`;
}
