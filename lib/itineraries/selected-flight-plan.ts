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
  price: number | null;
  currency: string | null;
  stops: number | null;
  durationMinutes: number | null;
  airline: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
};

export type SelectedFlightPlanSnapshot = {
  version: 1;
  travelers: number;
  returnHome: boolean;
  savedAt: string;
  legs: SelectedFlightLegSnapshot[];
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
  return {
    version: 1,
    travelers: Math.max(1, travelers),
    returnHome: plan.returnHome !== false,
    savedAt: new Date().toISOString(),
    legs,
  };
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
  if (o.version !== 1 || !Array.isArray(o.legs) || o.legs.length === 0) return null;
  return o;
}

/** Display-only fallback when selected_flight_plan is empty (use planned_legs). */
export function snapshotFromPlannedLegs(
  legs: PlannedLeg[] | null | undefined,
  travelers = 1
): SelectedFlightPlanSnapshot | null {
  if (!legs?.length) return null;
  return {
    version: 1,
    travelers: Math.max(1, travelers),
    returnHome: legs.some((l) => l.kind === 'return'),
    savedAt: new Date(0).toISOString(),
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
