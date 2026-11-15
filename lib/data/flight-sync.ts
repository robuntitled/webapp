import 'server-only';

import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { getFlightBooking } from '@/lib/liteapi/flight-booking';
import { isFlightPendingConfirmation } from '@/lib/itineraries/bookings';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';
import { listPracticeFlightBookings } from '@/lib/itineraries/practice-flights';
import { getPractice, savePracticeFlightBooking } from '@/lib/data/practices';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type FlightSyncResult = {
  practiceId: string;
  updated: boolean;
  /** Primary (first) leg — kept for backward compat. */
  status: string | null;
  bookingRef: string | null;
  bookingId?: string | null;
  /** Per-leg results so multi-tratta UIs never mix codes. */
  legs: Array<{
    bookingId: string | null;
    bookingRef: string | null;
    status: string | null;
    updated: boolean;
  }>;
  error?: string;
};

async function syncOneLeg(
  practiceId: string,
  userId: string,
  recap: FlightBookingRecap
): Promise<{
  bookingId: string | null;
  bookingRef: string | null;
  status: string | null;
  updated: boolean;
  error?: string;
}> {
  if (!recap.bookingId) {
    return {
      bookingId: recap.bookingId ?? null,
      bookingRef: recap.bookingRef ?? null,
      status: recap.status ?? null,
      updated: false,
    };
  }

  if (!isLiteApiConfigured()) {
    return {
      bookingId: recap.bookingId,
      bookingRef: recap.bookingRef ?? null,
      status: recap.status ?? null,
      updated: false,
    };
  }

  try {
    const remote = await getFlightBooking(recap.bookingId);
    const nextStatus = remote.status ?? recap.status;
    const nextRef = remote.bookingRef ?? recap.bookingRef;
    const changed =
      nextStatus !== recap.status || Boolean(nextRef && nextRef !== recap.bookingRef);

    if (changed) {
      const nextRecap: FlightBookingRecap = {
        ...recap,
        status: nextStatus,
        bookingRef: nextRef ?? recap.bookingRef,
      };
      const saved = await savePracticeFlightBooking({
        practiceId,
        userId,
        recap: nextRecap,
      });
      if ('error' in saved) {
        console.error('[flight-sync] save failed', practiceId, saved.error);
        return {
          bookingId: recap.bookingId,
          bookingRef: recap.bookingRef ?? null,
          status: recap.status ?? null,
          updated: false,
          error: saved.error,
        };
      }
    }

    return {
      bookingId: recap.bookingId,
      bookingRef: nextRef ?? null,
      status: nextStatus ?? null,
      updated: changed,
    };
  } catch (err) {
    console.error('[flight-sync]', practiceId, recap.bookingId, err);
    return {
      bookingId: recap.bookingId,
      bookingRef: recap.bookingRef ?? null,
      status: recap.status ?? null,
      updated: false,
    };
  }
}

export async function syncPracticeFlightStatus(
  practiceId: string,
  userId: string,
  opts?: { bookingId?: string | null }
): Promise<FlightSyncResult | { error: string }> {
  const practice = await getPractice(practiceId, userId);
  if (!practice) return { error: 'Pratica non trovata.' };

  const all = listPracticeFlightBookings(practice);
  const targetId = opts?.bookingId?.trim() || null;
  const toSync = targetId
    ? all.filter((r) => r.bookingId === targetId)
    : all.filter((r) => r.bookingId);

  if (!toSync.length) {
    const primary = all[0] ?? practice.flight_booking ?? null;
    return {
      practiceId,
      updated: false,
      status: primary?.status ?? null,
      bookingRef: primary?.bookingRef ?? null,
      bookingId: primary?.bookingId ?? null,
      legs: [],
    };
  }

  const legs: FlightSyncResult['legs'] = [];
  let anyUpdated = false;
  let lastError: string | undefined;

  for (const recap of toSync) {
    const result = await syncOneLeg(practiceId, userId, recap);
    if (result.updated) anyUpdated = true;
    if (result.error) lastError = result.error;
    legs.push({
      bookingId: result.bookingId,
      bookingRef: result.bookingRef,
      status: result.status,
      updated: result.updated,
    });
  }

  const primary = legs[0] ?? {
    bookingId: null,
    bookingRef: null,
    status: null,
    updated: false,
  };

  return {
    practiceId,
    updated: anyUpdated,
    status: primary.status,
    bookingRef: primary.bookingRef,
    bookingId: primary.bookingId,
    legs,
    ...(lastError ? { error: lastError } : {}),
  };
}

export async function syncPendingFlightBookings(): Promise<{
  scanned: number;
  updated: number;
  errors: number;
}> {
  if (!isLiteApiConfigured()) {
    return { scanned: 0, updated: 0, errors: 0 };
  }

  const { data, error } = await supabaseAdmin
    .from('practices')
    .select('id, user_id, flight_booking, flight_bookings')
    .neq('status', 'cancelled')
    .gte('date_to', new Date().toISOString().slice(0, 10));

  if (error || !data?.length) {
    return { scanned: 0, updated: 0, errors: error ? 1 : 0 };
  }

  let updated = 0;
  let errors = 0;
  let scanned = 0;

  for (const row of data) {
    const practiceLike = {
      flight_booking: row.flight_booking as FlightBookingRecap | null,
      flight_bookings: row.flight_bookings as FlightBookingRecap[] | null,
    };
    const bookings = listPracticeFlightBookings(practiceLike).filter(
      (r) => r.bookingId && isFlightPendingConfirmation(r.status)
    );
    if (!bookings.length) continue;
    scanned += bookings.length;
    const result = await syncPracticeFlightStatus(row.id as string, row.user_id as string);
    if ('error' in result && result.error && !('updated' in result)) {
      errors++;
      continue;
    }
    if ('error' in result && result.error) {
      errors++;
    } else if ('updated' in result && result.updated) {
      updated++;
    }
  }

  return { scanned, updated, errors };
}
