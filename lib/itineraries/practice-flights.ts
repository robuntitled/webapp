/**
 * Lettura/scrittura multi-volo sulla pratica (M1).
 * Compatibile con schema pre-M1 (solo flight_booking) e post-M1 (flight_bookings[]).
 */

import {
  FLIGHT_ALREADY_BOOKED_ERROR,
  isSamePracticeFlightBooking,
  parseFlightStatus,
  type FlightBookingRecap,
} from '@/lib/itineraries/bookings';
import type { PracticeRow } from '@/lib/itineraries/types';

export { FLIGHT_ALREADY_BOOKED_ERROR };

export function listPracticeFlightBookings(
  practice: Pick<PracticeRow, 'flight_booking' | 'flight_bookings'>
): FlightBookingRecap[] {
  const list = practice.flight_bookings;
  if (Array.isArray(list) && list.length > 0) {
    return list.filter((f): f is FlightBookingRecap => Boolean(f?.outbound));
  }
  if (practice.flight_booking?.outbound) return [practice.flight_booking];
  return [];
}

export function primaryPracticeFlight(
  practice: Pick<PracticeRow, 'flight_booking' | 'flight_bookings'>
): FlightBookingRecap | null {
  return listPracticeFlightBookings(practice)[0] ?? null;
}

/**
 * True when at least one booking is T1/T2/T3 (pending / confirmed / needs_review).
 * FAILED / CANCELLED alone never count — avoids «Prenotato» on failed legs (P0-7).
 */
export function practiceHasSuccessfulFlightBooking(
  practice: Pick<
    PracticeRow,
    'flight_confirmed_at' | 'flight_booking' | 'flight_bookings'
  >
): boolean {
  const bookings = listPracticeFlightBookings(practice);
  const anyHeld = bookings.some((b) => {
    const kind = parseFlightStatus(b.status);
    return kind === 'confirmed' || kind === 'pending' || kind === 'needs_review';
  });
  if (anyHeld) return true;
  // Legacy row with confirmed_at and no usable booking rows.
  if (practice.flight_confirmed_at && bookings.length === 0) return true;
  return false;
}

/**
 * @deprecated Prefer `practiceHasSuccessfulFlightBooking` — FAILED no longer counts.
 * Kept as alias so existing call sites stop treating FAILED as booked.
 */
export function practiceHasFlightBooked(
  practice: Pick<
    PracticeRow,
    'flight_confirmed_at' | 'flight_booking' | 'flight_bookings'
  >
): boolean {
  return practiceHasSuccessfulFlightBooking(practice);
}

/**
 * Prepara il patch di salvataggio volo.
 * `multiFlightSupported` = true solo se la colonna flight_bookings è disponibile (M1 applicata).
 */
export function prepareFlightBookingPatch(
  practice: Pick<PracticeRow, 'flight_booking' | 'flight_bookings'>,
  recap: FlightBookingRecap,
  multiFlightSupported: boolean
):
  | {
      ok: true;
      patch: {
        flight_booking: FlightBookingRecap;
        flight_bookings?: FlightBookingRecap[];
      };
    }
  | { ok: false; error: string } {
  const existing = listPracticeFlightBookings(practice);
  const sameIdx = existing.findIndex((f) => isSamePracticeFlightBooking(f, recap));

  if (sameIdx >= 0) {
    const next = [...existing];
    next[sameIdx] = recap;
    return {
      ok: true,
      patch: {
        flight_booking: next[0]!,
        ...(multiFlightSupported ? { flight_bookings: next } : {}),
      },
    };
  }

  if (existing.length > 0 && !multiFlightSupported) {
    return { ok: false, error: FLIGHT_ALREADY_BOOKED_ERROR };
  }

  const next = [...existing, recap];
  return {
    ok: true,
    patch: {
      flight_booking: next[0]!,
      ...(multiFlightSupported ? { flight_bookings: next } : {}),
    },
  };
}
