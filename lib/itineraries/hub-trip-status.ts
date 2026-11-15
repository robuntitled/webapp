import {
  listPracticeFlightBookings,
  practiceHasSuccessfulFlightBooking,
} from '@/lib/itineraries/practice-flights';
import { parseFlightStatus, type FlightStatusKind } from '@/lib/itineraries/bookings';
import {
  parseSelectedFlightPlan,
  snapshotFromPlannedLegs,
} from '@/lib/itineraries/selected-flight-plan';
import type { PracticeRow } from '@/lib/itineraries/types';
import { DASHBOARD_VIAGGI_COPY } from '@/lib/itineraries/dashboard-viaggi-copy';

/** Mirrors `<StatusBadge tone>` (ok/warn/err/info/neu). */
export type HubStatusTone = 'ok' | 'warn' | 'err' | 'info' | 'neu';

export type HubTripBadgeId =
  | 'draft'
  | 'flightPending'
  | 'booked'
  | 'bookedPartial'
  | 'toBook'
  | 'needsReview'
  | 'failed'
  | 'carrierCancelled';

export type HubTripBadge = {
  id: HubTripBadgeId;
  label: string;
  tone: 'neutral' | 'amber' | 'emerald' | 'rose' | 'slate';
  /** Design-system tone for `<StatusBadge>`. */
  statusTone: HubStatusTone;
  /** Successful (T1/T2) bookings vs expected legs — for partial labels. */
  bookedCount?: number;
  expectedCount?: number;
};

/** Statuses that count as a paid / held seat (never FAILED / CANCELLED). */
export function isSuccessfulFlightStatus(kind: FlightStatusKind): boolean {
  return kind === 'confirmed' || kind === 'pending' || kind === 'needs_review';
}

function flightKinds(p: PracticeRow): FlightStatusKind[] {
  return listPracticeFlightBookings(p).map((b) => parseFlightStatus(b.status));
}

function primaryFlightStatus(p: PracticeRow): FlightStatusKind | null {
  const kinds = flightKinds(p);
  if (!kinds.length) return null;
  // Prefer cancelled / needs_review / pending / failed signal from any leg.
  if (kinds.includes('cancelled')) return 'cancelled';
  if (kinds.includes('needs_review')) return 'needs_review';
  if (kinds.includes('pending')) return 'pending';
  if (kinds.includes('failed')) return 'failed';
  if (kinds.includes('confirmed')) return 'confirmed';
  return kinds[0] ?? null;
}

/** Expected flight legs from the saved plan (excludes domestic/internal hops). */
export function expectedFlightLegCount(p: PracticeRow): number {
  const plan =
    parseSelectedFlightPlan(p.selected_flight_plan) ??
    snapshotFromPlannedLegs(p.planned_legs);
  const planned = (plan?.legs ?? []).filter(
    (l) => l.kind !== 'domestic' && l.kind !== 'internal'
  ).length;
  const bookings = listPracticeFlightBookings(p).length;
  if (planned > 0) return planned;
  return Math.max(bookings, 0);
}

/** Bookings in T1/T2/T3 (paid / held) — FAILED never counts. */
export function successfulFlightBookingCount(p: PracticeRow): number {
  return listPracticeFlightBookings(p).filter((b) =>
    isSuccessfulFlightStatus(parseFlightStatus(b.status))
  ).length;
}

/** Badge stato per le card dashboard (una etichetta primaria). */
export function resolveHubTripBadge(p: PracticeRow): HubTripBadge {
  const flightKind = primaryFlightStatus(p);
  const copy = DASHBOARD_VIAGGI_COPY.badges;
  const expected = expectedFlightLegCount(p);
  const bookedOk = successfulFlightBookingCount(p);
  const kinds = flightKinds(p);
  const onlyFailed =
    kinds.length > 0 &&
    kinds.every((k) => k === 'failed' || k === 'cancelled') &&
    kinds.some((k) => k === 'failed');

  if (flightKind === 'cancelled' && bookedOk === 0) {
    return {
      id: 'carrierCancelled',
      label: copy.carrierCancelled,
      tone: 'slate',
      statusTone: 'neu',
    };
  }
  // T3 / V3b — never green
  if (flightKind === 'needs_review') {
    return {
      id: 'needsReview',
      label: copy.needsReview,
      tone: 'amber',
      statusTone: 'warn',
      bookedCount: bookedOk,
      expectedCount: expected || undefined,
    };
  }
  // T4 — FAILED must never surface as «Prenotato»
  if (flightKind === 'failed' || onlyFailed) {
    return {
      id: 'failed',
      label: copy.failed,
      tone: 'rose',
      statusTone: 'err',
    };
  }
  if (flightKind === 'pending' && (expected <= 1 || bookedOk >= expected)) {
    return {
      id: 'flightPending',
      label: copy.flightPending,
      tone: 'amber',
      statusTone: 'warn',
      bookedCount: bookedOk,
      expectedCount: expected || undefined,
    };
  }

  // V3 — some but not all expected legs held/confirmed
  if (bookedOk > 0 && expected > bookedOk) {
    return {
      id: 'bookedPartial',
      label: copy.bookedPartialOf(bookedOk, expected),
      tone: 'amber',
      statusTone: 'warn',
      bookedCount: bookedOk,
      expectedCount: expected,
    };
  }

  if (
    practiceHasSuccessfulFlightBooking(p) ||
    flightKind === 'confirmed' ||
    (bookedOk > 0 && (expected === 0 || bookedOk >= expected))
  ) {
    // Still partial if we only have pending across multiple legs? handled above.
    if (bookedOk > 0 && expected > bookedOk) {
      return {
        id: 'bookedPartial',
        label: copy.bookedPartialOf(bookedOk, expected),
        tone: 'amber',
        statusTone: 'warn',
        bookedCount: bookedOk,
        expectedCount: expected,
      };
    }
    return {
      id: 'booked',
      label: copy.booked,
      tone: 'emerald',
      statusTone: 'ok',
      bookedCount: bookedOk,
      expectedCount: expected || undefined,
    };
  }

  if (p.status === 'draft') {
    return {
      id: 'draft',
      label: copy.draft,
      tone: 'neutral',
      statusTone: 'neu',
    };
  }
  return {
    id: 'toBook',
    label: copy.toBook,
    tone: 'amber',
    statusTone: 'warn',
  };
}

/** @deprecated Prefer `StatusBadge` + `badge.statusTone`; kept for PracticeTripCard. */
export function hubBadgeClassName(tone: HubTripBadge['tone']): string {
  switch (tone) {
    case 'emerald':
      return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200';
    case 'amber':
      return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200';
    case 'rose':
      return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200';
    case 'slate':
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    default:
      return 'bg-stone-100 text-stone-700 ring-1 ring-stone-200';
  }
}

export function hubBadgeToStatusTone(tone: HubTripBadge['tone']): HubStatusTone {
  switch (tone) {
    case 'emerald':
      return 'ok';
    case 'amber':
      return 'warn';
    case 'rose':
      return 'err';
    case 'slate':
      return 'neu';
    default:
      return 'neu';
  }
}

export function practiceHasPaidHotelOrActivity(
  p: Pick<PracticeRow, 'hotel_bookings' | 'activity_bookings' | 'hotel_confirmed_at' | 'activity_confirmed_at'>
): boolean {
  if (p.hotel_confirmed_at || p.activity_confirmed_at) return true;
  if ((p.hotel_bookings?.length ?? 0) > 0) return true;
  if ((p.activity_bookings?.length ?? 0) > 0) return true;
  return false;
}
