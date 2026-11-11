/**
 * Persist Organizza Voli selections on a practice (until checkout).
 * Shape is intentional snapshots — not confirmed bookings.
 */

import type { TripFlightPlan } from '@/lib/travel/trip-flight-legs';
import type { PlannedLeg } from '@/lib/itineraries/free-trip';

export type SelectedFlightLegSnapshot = {
  id: string;
  kind: string;
  originIata: string;
  destinationIata: string;
  date: string;
  labelIt: string;
  offerId: string | null;
  /**
   * Unit price **a persona** (source of truth).
   * Party total = price × travelers. Never store an ambiguous party total here.
   */
  price: number | null;
  currency: string | null;
  stops: number | null;
  durationMinutes: number | null;
  airline: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
};

export type SelectedFlightPlanSnapshot = {
  /** 1 = legacy (may be party total); 2 = unit a persona. */
  version: 1 | 2;
  travelers: number;
  returnHome: boolean;
  savedAt: string;
  legs: SelectedFlightLegSnapshot[];
  /**
   * `unit` = leg.price is a persona (canonical).
   * `party` = legacy Organizza party totals (normalize ÷ travelers).
   */
  priceMode?: 'unit' | 'party';
};

export function tripPlanToSelectedSnapshot(
  plan: TripFlightPlan | null | undefined,
  travelers: number
): SelectedFlightPlanSnapshot | null {
  if (!plan?.legs?.length) return null;
  const legs = plan.legs
    .filter((l) => l.kind !== 'domestic' && l.kind !== 'internal')
    .map((l) => ({
      id: l.id,
      kind: l.kind,
      originIata: l.originIata,
      destinationIata: l.destinationIata,
      date: l.date,
      labelIt: l.labelIt,
      offerId: l.offer?.offerId ?? null,
      price: l.offer?.price ?? null,
      currency: l.offer?.currency ?? null,
      stops: l.offer?.stops ?? null,
      durationMinutes: l.offer?.durationMinutes ?? null,
      airline: l.offer?.airline ?? null,
      departureAt: l.offer?.departureAt ?? null,
      arrivalAt: l.offer?.arrivalAt ?? null,
    }));
  if (!legs.length) return null;
  return normalizeSelectedFlightPlan({
    version: 2,
    travelers: Math.max(1, travelers),
    returnHome: plan.returnHome !== false,
    savedAt: new Date().toISOString(),
    priceMode: 'unit',
    legs,
  });
}

export function plannedLegsFromSelected(
  snap: SelectedFlightPlanSnapshot | null | undefined
): PlannedLeg[] {
  if (!snap?.legs?.length) return [];
  return snap.legs.map((l) => ({
    origin: l.originIata,
    destination: l.destinationIata,
    date: l.date,
    kind:
      l.kind === 'outbound'
        ? 'outbound'
        : l.kind === 'return' || l.kind === 'openjaw_return'
          ? 'return'
          : l.kind === 'intercountry' || l.kind === 'internal'
            ? 'internal'
            : 'other',
  }));
}

export function parseSelectedFlightPlan(raw: unknown): SelectedFlightPlanSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as SelectedFlightPlanSnapshot;
  if ((o.version !== 1 && o.version !== 2) || !Array.isArray(o.legs) || o.legs.length === 0) {
    return null;
  }
  return normalizeSelectedFlightPlan(o);
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Canonicalize stored plans to unit (a persona) prices.
 * - priceMode `unit` / version 2 → as-is
 * - priceMode `party` → ÷ travelers (legacy Organizza party totals)
 * - missing priceMode on version 1 → treat as unit if already looks like
 *   post-Modifica unit storage; only convert when explicitly marked `party`.
 *
 * Deterministic rule: only `priceMode: 'party'` divides. Writers always set
 * `priceMode: 'unit'` + version 2. Ambiguous v1 without mode is read as unit
 * (fixes the fb2b187 double-divide after Modifica with adults=1).
 */
export function normalizeSelectedFlightPlan(
  plan: SelectedFlightPlanSnapshot
): SelectedFlightPlanSnapshot {
  const travelers = Math.max(1, plan.travelers || 1);
  if (plan.priceMode === 'unit' || plan.version === 2) {
    return {
      ...plan,
      version: 2,
      travelers,
      priceMode: 'unit',
      legs: plan.legs.map((l) => ({
        ...l,
        price:
          l.price == null || !Number.isFinite(l.price) ? l.price : roundMoney(l.price),
      })),
    };
  }
  if (plan.priceMode === 'party') {
    return {
      ...plan,
      version: 2,
      travelers,
      priceMode: 'unit',
      legs: plan.legs.map((l) => ({
        ...l,
        price:
          l.price == null || !Number.isFinite(l.price)
            ? l.price
            : roundMoney(l.price / travelers),
      })),
    };
  }
  // version 1, no priceMode: assume unit (Modifica / current SoT).
  return {
    ...plan,
    version: 2,
    travelers,
    priceMode: 'unit',
    legs: plan.legs.map((l) => ({
      ...l,
      price:
        l.price == null || !Number.isFinite(l.price) ? l.price : roundMoney(l.price),
    })),
  };
}

/** Display-only fallback when selected_flight_plan is empty (use planned_legs). */
export function snapshotFromPlannedLegs(
  legs: PlannedLeg[] | null | undefined,
  travelers = 1
): SelectedFlightPlanSnapshot | null {
  if (!legs?.length) return null;
  return {
    version: 2,
    travelers: Math.max(1, travelers),
    returnHome: legs.some((l) => l.kind === 'return'),
    savedAt: new Date(0).toISOString(),
    priceMode: 'unit',
    legs: legs.map((l, i) => ({
      id: `planned-${i}-${l.origin}-${l.destination}`,
      kind: l.kind ?? 'other',
      originIata: l.origin,
      destinationIata: l.destination,
      date: l.date,
      labelIt: `${l.origin} → ${l.destination}`,
      offerId: null,
      price: null,
      currency: null,
      stops: null,
      durationMinutes: null,
      airline: null,
      departureAt: null,
      arrivalAt: null,
    })),
  };
}

/** First purchasable offer (for checkout draft). */
export function primaryOfferFromSelected(
  snap: SelectedFlightPlanSnapshot | null
): SelectedFlightLegSnapshot | null {
  if (!snap) return null;
  return snap.legs.find((l) => l.offerId && l.price != null) ?? null;
}

/** Legs that have an offerId + price (can be booked as one-way tickets). */
export function purchasableLegsFromSelected(
  snap: SelectedFlightPlanSnapshot | null | undefined
): SelectedFlightLegSnapshot[] {
  if (!snap?.legs?.length) return [];
  return snap.legs.filter(
    (l) => Boolean(l.offerId) && l.price != null && Number.isFinite(l.price)
  );
}

export const PRACTICE_FLIGHTS_STORAGE_PREFIX = 'nl-practice-selected-flights-';

export function savePracticeFlightsLocal(
  practiceId: string,
  snap: SelectedFlightPlanSnapshot
): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${PRACTICE_FLIGHTS_STORAGE_PREFIX}${practiceId}`,
      JSON.stringify(snap)
    );
  } catch {
    /* ignore */
  }
}

export function loadPracticeFlightsLocal(
  practiceId: string
): SelectedFlightPlanSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(
      `${PRACTICE_FLIGHTS_STORAGE_PREFIX}${practiceId}`
    );
    if (!raw) return null;
    return parseSelectedFlightPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}
