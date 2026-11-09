import { getMaster } from '@/lib/itineraries/masters/registry';

export type DaySplitShare = {
  slug: string;
  nameIt: string;
  days: number;
  weight: number;
  minDays: number;
};

/**
 * Soft minimum for a country leg inside a multi-country trip.
 * Uses core stops only (first two) so short combos (10g) still fit;
 * remapper may drop extend/optional stops when compressed.
 */
export function minDaysForMaster(slug: string): number {
  const m = getMaster(slug);
  if (!m) return 3;
  const cores = m.stops.filter((s) => s.priority === 'core').slice(0, 2);
  const nights = cores.reduce((sum, s) => sum + s.nightsMin, 0);
  // Cap: multi-country legs stay compact; never below 3 calendar days.
  return Math.max(3, Math.min(nights + 1, 5));
}

/**
 * Split remaining days (after inter-country transfer) proportional to idealTripDays,
 * then enforce min days. Returns null if trip is too short.
 */
export function splitDaysAcrossCountries(
  orderedSlugs: string[],
  tripDays: number,
  transferDays = 1
): DaySplitShare[] | null {
  if (orderedSlugs.length < 2) return null;
  const remaining = tripDays - transferDays;
  if (remaining < orderedSlugs.length * 3) return null;

  const metas = orderedSlugs.map((slug) => {
    const m = getMaster(slug);
    if (!m) return null;
    return {
      slug,
      nameIt: m.nameIt,
      weight: Math.max(1, m.idealTripDays),
      minDays: minDaysForMaster(slug),
    };
  });
  if (metas.some((x) => x == null)) return null;
  const rows = metas as NonNullable<(typeof metas)[number]>[];

  const minSum = rows.reduce((s, r) => s + r.minDays, 0);
  if (remaining < minSum) return null;

  const weightSum = rows.reduce((s, r) => s + r.weight, 0);
  const raw = rows.map((r) => ({
    ...r,
    days: Math.floor((remaining * r.weight) / weightSum),
  }));

  // Lift to mins
  for (const r of raw) {
    if (r.days < r.minDays) r.days = r.minDays;
  }

  let assigned = raw.reduce((s, r) => s + r.days, 0);
  // If over remaining, trim from largest surplus above min
  while (assigned > remaining) {
    const candidate = [...raw]
      .filter((r) => r.days > r.minDays)
      .sort((a, b) => b.days - a.days)[0];
    if (!candidate) return null;
    candidate.days -= 1;
    assigned -= 1;
  }
  // Distribute leftover to highest weight
  while (assigned < remaining) {
    const candidate = [...raw].sort((a, b) => b.weight - a.weight)[0]!;
    candidate.days += 1;
    assigned += 1;
  }

  return raw.map((r) => ({
    slug: r.slug,
    nameIt: r.nameIt,
    days: r.days,
    weight: r.weight,
    minDays: r.minDays,
  }));
}
