import 'server-only';

import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { getFlightBooking } from '@/lib/liteapi/flight-booking';
import { isFlightPendingConfirmation } from '@/lib/itineraries/bookings';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';
import { getPractice, savePracticeFlightBooking } from '@/lib/data/practices';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type FlightSyncResult = {
  practiceId: string;
  updated: boolean;
  status: string | null;
  bookingRef: string | null;
};

export async function syncPracticeFlightStatus(
  practiceId: string,
  userId: string
): Promise<FlightSyncResult | { error: string }> {
  const practice = await getPractice(practiceId, userId);
  if (!practice) return { error: 'Pratica non trovata.' };

  const recap = practice.flight_booking;
  if (!recap?.bookingId) {
    return {
      practiceId,
      updated: false,
      status: recap?.status ?? null,
      bookingRef: recap?.bookingRef ?? null,
    };
  }

  if (!isLiteApiConfigured()) {
    return {
      practiceId,
      updated: false,
      status: recap.status,
      bookingRef: recap.bookingRef,
    };
  }

  try {
    const remote = await getFlightBooking(recap.bookingId);
    const nextStatus = remote.status ?? recap.status;
    const nextRef = remote.bookingRef ?? recap.bookingRef;
    const changed =
      nextStatus !== recap.status ||
      Boolean(nextRef && nextRef !== recap.bookingRef);

    if (changed) {
      const nextRecap: FlightBookingRecap = {
        ...recap,
        status: nextStatus,
        bookingRef: nextRef ?? recap.bookingRef,
      };
      await savePracticeFlightBooking({
        practiceId,
        userId,
        recap: nextRecap,
      });
    }

    return {
      practiceId,
      updated: changed,
      status: nextStatus,
      bookingRef: nextRef,
    };
  } catch (err) {
    console.error('[flight-sync]', practiceId, err);
    return {
      practiceId,
      updated: false,
      status: recap.status,
      bookingRef: recap.bookingRef,
    };
  }
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
    .select('id, user_id, flight_booking')
    .not('flight_booking', 'is', null)
    .neq('status', 'cancelled')
    .gte('date_to', new Date().toISOString().slice(0, 10));

  if (error || !data?.length) {
    return { scanned: 0, updated: 0, errors: error ? 1 : 0 };
  }

  let updated = 0;
  let errors = 0;
  let scanned = 0;

  for (const row of data) {
    const recap = row.flight_booking as FlightBookingRecap | null;
    if (!recap?.bookingId || !isFlightPendingConfirmation(recap.status)) continue;
    scanned++;
    const result = await syncPracticeFlightStatus(row.id as string, row.user_id as string);
    if (result && 'error' in result) {
      errors++;
    } else if (result.updated) {
      updated++;
    }
  }

  return { scanned, updated, errors };
}
