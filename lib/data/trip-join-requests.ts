import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type PendingJoinRequest = {
  id: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  message: string | null;
  createdAt: string;
  from: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
};

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === '42P01';
}

async function hydrate(
  rows: { id: string; trip_id: string; user_id: string; message: string | null; created_at: string }[]
): Promise<PendingJoinRequest[]> {
  const tripIds = [...new Set(rows.map((r) => r.trip_id))];
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [{ data: trips }, { data: users }] = await Promise.all([
    supabaseAdmin.from('trips').select('id, title, destination').in('id', tripIds),
    supabaseAdmin
      .from('users')
      .select('id, username, first_name, last_name, image')
      .in('id', userIds),
  ]);

  const tripMap = new Map((trips ?? []).map((t) => [t.id as string, t]));
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

  return rows
    .map((row) => {
      const trip = tripMap.get(row.trip_id);
      if (!trip) return null;
      const from = userMap.get(row.user_id);
      return {
        id: row.id,
        tripId: row.trip_id,
        tripTitle: String(trip.title ?? 'Viaggio'),
        tripDestination: String(trip.destination ?? ''),
        message: row.message,
        createdAt: String(row.created_at),
        from: {
          id: (from?.id as string) ?? row.user_id,
          username: (from?.username as string | null) ?? null,
          firstName: (from?.first_name as string | null) ?? null,
          lastName: (from?.last_name as string | null) ?? null,
          image: (from?.image as string | null) ?? null,
        },
      };
    })
    .filter(Boolean) as PendingJoinRequest[];
}

/** Richieste in attesa su tutti i viaggi creati dall'utente. */
export async function listPendingJoinRequestsForOrganizer(
  organizerId: string
): Promise<PendingJoinRequest[]> {
  const { data: trips, error: tripsError } = await supabaseAdmin
    .from('trips')
    .select('id')
    .eq('creator_id', organizerId);

  if (tripsError || !trips?.length) return [];

  const { data, error } = await supabaseAdmin
    .from('trip_join_requests')
    .select('id, trip_id, user_id, message, created_at')
    .in(
      'trip_id',
      trips.map((t) => t.id as string)
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data?.length) {
    if (error && !isMissingTable(error)) {
      console.error('[trip-join-requests]', error.message);
    }
    return [];
  }

  return hydrate(data as never);
}

/** Richieste in attesa su un singolo viaggio. */
export async function listPendingJoinRequestsForTrip(
  tripId: string
): Promise<PendingJoinRequest[]> {
  const { data, error } = await supabaseAdmin
    .from('trip_join_requests')
    .select('id, trip_id, user_id, message, created_at')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data?.length) {
    if (error && !isMissingTable(error)) {
      console.error('[trip-join-requests]', error.message);
    }
    return [];
  }

  return hydrate(data as never);
}

/** Stato della richiesta dell'utente corrente su un viaggio. */
export async function getJoinRequestStatus(
  tripId: string,
  userId: string
): Promise<'pending' | 'accepted' | 'rejected' | 'cancelled' | null> {
  const { data, error } = await supabaseAdmin
    .from('trip_join_requests')
    .select('status')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.status as 'pending' | 'accepted' | 'rejected' | 'cancelled';
}
