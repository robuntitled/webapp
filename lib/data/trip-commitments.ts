import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

function isMissing(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    Boolean(error?.message && /seat_status|flight_confirmed|hotel_confirmed/i.test(error.message))
  );
}

function tripMinSeats(minParticipants: number): number {
  return Number.isFinite(minParticipants) && minParticipants > 0 ? minParticipants : 1;
}

async function participantRow(tripId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('trip_participants')
    .select('user_id, seat_status')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error && !isMissing(error)) throw new Error(error.message);
  return data;
}

/** Legacy creator-trip seat confirm (still used when booking passes tripId). */
export async function confirmParticipantFlight(opts: {
  tripId: string;
  userId: string;
  bookingRef?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const row = await participantRow(opts.tripId, opts.userId);
  if (!row?.user_id) {
    return { ok: false, reason: 'not_participant' };
  }

  const { error } = await supabaseAdmin
    .from('trip_participants')
    .update({
      seat_status: 'confirmed',
      flight_confirmed_at: new Date().toISOString(),
      flight_booking_ref: opts.bookingRef ?? null,
    })
    .eq('trip_id', opts.tripId)
    .eq('user_id', opts.userId);

  if (error) {
    if (isMissing(error)) return { ok: false, reason: 'schema' };
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function confirmParticipantHotel(opts: {
  tripId: string;
  userId: string;
  matchesGroup: boolean;
  bookingRef?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const row = await participantRow(opts.tripId, opts.userId);
  if (!row?.user_id) {
    return { ok: false, reason: 'not_participant' };
  }

  const trip = await supabaseAdmin
    .from('trips')
    .select('id, template_id, min_participants')
    .eq('id', opts.tripId)
    .maybeSingle();

  if (trip.data?.template_id) {
    const { count } = await supabaseAdmin
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', opts.tripId)
      .eq('seat_status', 'confirmed');

    const min = tripMinSeats(Number(trip.data.min_participants) || 0);
    if ((count ?? 0) < min) {
      return { ok: false, reason: 'flight_threshold' };
    }
  }

  const { error } = await supabaseAdmin
    .from('trip_participants')
    .update({
      hotel_confirmed_at: new Date().toISOString(),
      hotel_matches_group: opts.matchesGroup,
    })
    .eq('trip_id', opts.tripId)
    .eq('user_id', opts.userId);

  if (error) {
    if (isMissing(error)) return { ok: false, reason: 'schema' };
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function tripAllowsHotelBooking(tripId: string): Promise<boolean> {
  const { data: trip, error } = await supabaseAdmin
    .from('trips')
    .select('id, template_id, min_participants')
    .eq('id', tripId)
    .maybeSingle();
  if (error || !trip) return false;
  if (!trip.template_id) return true;

  const min = tripMinSeats(Number(trip.min_participants) || 0);
  const { count } = await supabaseAdmin
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .eq('seat_status', 'confirmed');

  return (count ?? 0) >= min;
}
