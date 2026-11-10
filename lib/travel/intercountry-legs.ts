/**
 * Build N-1 inter-country flight legs for N destination countries.
 * These are international between countries (e.g. SGN→REP), never domestic.
 */

import { findCuratedPair, resolveOrderedSlugs } from '@/lib/itineraries/multi-country';
import { getMaster } from '@/lib/itineraries/masters';

export type IntercountryHop = {
  originIata: string;
  destinationIata: string;
  date: string;
  labelIt: string;
  notesIt?: string;
  fromSlug: string;
  toSlug: string;
  curated: boolean;
};

function iatasFromNotes(notes: string): [string, string] | null {
  const matches = notes.match(/\b([A-Z]{3})\b/g);
  if (!matches || matches.length < 2) return null;
  return [matches[0]!, matches[1]!];
}

function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(`${iso}T12:00:00Z`);
  if (!Number.isFinite(t)) return iso;
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 86400000);
}

function hubsForPair(
  fromSlug: string,
  toSlug: string
): { origin: string; destination: string; notesIt: string; curated: boolean } | null {
  const curated = resolveOrderedSlugs(fromSlug, toSlug);
  if (curated) {
    const { pair, ordered } = curated;
    // Pair may be reverse of travel order
    const forward = ordered[0] === fromSlug;
    const fromNotes = iatasFromNotes(pair.transfer.notesIt);
    if (forward) {
      const origin =
        fromNotes?.[0] ??
        getMaster(fromSlug)?.hubs[getMaster(fromSlug)!.hubs.length - 1] ??
        pair.arrivalHubIata;
      const destination =
        fromNotes?.[1] ?? getMaster(toSlug)?.hubs[0] ?? pair.departureHubIata;
      return {
        origin,
        destination,
        notesIt: pair.transfer.notesIt,
        curated: true,
      };
    }
    // Reverse direction: use hubs flipped when notes don't apply cleanly
    const origin = getMaster(fromSlug)?.hubs[0] ?? pair.departureHubIata;
    const destination = getMaster(toSlug)?.hubs[0] ?? pair.arrivalHubIata;
    return {
      origin,
      destination,
      notesIt: `Collegamento ${fromSlug} → ${toSlug} (direzione inversa alla coppia curata) — verifica orari.`,
      curated: true,
    };
  }

  const fromMaster = getMaster(fromSlug);
  const toMaster = getMaster(toSlug);
  if (!fromMaster || !toMaster) return null;
  const origin = fromMaster.hubs[fromMaster.hubs.length - 1] ?? fromMaster.hubs[0];
  const destination = toMaster.hubs[0];
  if (!origin || !destination) return null;
  return {
    origin,
    destination,
    notesIt:
      'Combinazione libera: verifica collegamenti e tempi tra i paesi (Viaggiare Sicuri).',
    curated: false,
  };
}

/**
 * N countries → N-1 intercountry hops.
 * Dates spaced by share days (or equal split), editable later by the user.
 */
export function buildIntercountryHops(input: {
  orderedSlugs: string[];
  dateFrom: string;
  dateTo: string;
  /** Days spent in each country (same order as slugs). */
  shareDays?: number[];
}): IntercountryHop[] {
  const slugs = input.orderedSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (slugs.length < 2) return [];

  const span = Math.max(1, daysBetween(input.dateFrom, input.dateTo));
  const shares =
    input.shareDays && input.shareDays.length === slugs.length
      ? input.shareDays
      : slugs.map(() => Math.max(2, Math.floor(span / slugs.length)));

  const hops: IntercountryHop[] = [];
  let cursor = input.dateFrom;

  for (let i = 0; i < slugs.length - 1; i++) {
    const fromSlug = slugs[i]!;
    const toSlug = slugs[i + 1]!;
    const hubs = hubsForPair(fromSlug, toSlug);
    if (!hubs || hubs.origin === hubs.destination) continue;

    const stay = Math.max(1, shares[i]! - 1);
    let hopDate = addDaysIso(cursor, stay);
    // Keep hop before final return day
    if (hopDate >= input.dateTo) {
      hopDate = addDaysIso(input.dateTo, -1);
    }
    if (hopDate <= input.dateFrom) {
      hopDate = addDaysIso(input.dateFrom, i + 1);
    }

    hops.push({
      originIata: hubs.origin.toUpperCase(),
      destinationIata: hubs.destination.toUpperCase(),
      date: hopDate,
      labelIt: `Tra paesi ${hubs.origin.toUpperCase()} → ${hubs.destination.toUpperCase()}`,
      notesIt: hubs.notesIt,
      fromSlug,
      toSlug,
      curated: hubs.curated,
    });

    cursor = hopDate;
  }

  return hops;
}

/** Arrival hub of first country / departure hub of last for open-jaw. */
export function multiCountryGateHubs(orderedSlugs: string[]): {
  arrivalIata: string | null;
  departureIata: string | null;
} {
  const slugs = orderedSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (slugs.length === 0) return { arrivalIata: null, departureIata: null };
  if (slugs.length === 2) {
    const curated = resolveOrderedSlugs(slugs[0]!, slugs[1]!);
    if (curated) {
      return {
        arrivalIata: curated.pair.arrivalHubIata,
        departureIata: curated.pair.departureHubIata,
      };
    }
  }
  const first = getMaster(slugs[0]!);
  const last = getMaster(slugs[slugs.length - 1]!);
  return {
    arrivalIata: first?.hubs[0] ?? null,
    departureIata: last?.hubs[0] ?? first?.hubs[0] ?? null,
  };
}

export function isCuratedSlugPair(a: string, b: string): boolean {
  return Boolean(findCuratedPair(a, b) || findCuratedPair(b, a));
}
