import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type PendingTripInvite = {
  id: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  createdAt: string;
  from: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
};

export async function listPendingInvitesForUser(
  userId: string
): Promise<PendingTripInvite[]> {
  const { data, error } = await supabaseAdmin
    .from('trip_invites')
    .select('id, trip_id, created_at, from_user_id')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data?.length) {
    if (error && error.code !== '42P01') {
      console.error('[trip-invites]', error.message);
    }
    return [];
  }

  const tripIds = [...new Set(data.map((r) => r.trip_id as string))];
  const fromIds = [...new Set(data.map((r) => r.from_user_id as string))];

  const [{ data: trips }, { data: users }] = await Promise.all([
    supabaseAdmin
      .from('trips')
      .select('id, title, destination')
      .in('id', tripIds),
    supabaseAdmin
      .from('users')
      .select('id, username, first_name, last_name, image')
      .in('id', fromIds),
  ]);

  const tripMap = new Map((trips ?? []).map((t) => [t.id as string, t]));
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

  return data
    .map((row) => {
      const trip = tripMap.get(row.trip_id as string);
      const from = userMap.get(row.from_user_id as string);
      if (!trip) return null;
      return {
        id: row.id as string,
        tripId: row.trip_id as string,
        tripTitle: String(trip.title ?? 'Viaggio'),
        tripDestination: String(trip.destination ?? ''),
        createdAt: String(row.created_at),
        from: {
          id: (from?.id as string) ?? '',
          username: (from?.username as string | null) ?? null,
          firstName: (from?.first_name as string | null) ?? null,
          lastName: (from?.last_name as string | null) ?? null,
          image: (from?.image as string | null) ?? null,
        },
      };
    })
    .filter(Boolean) as PendingTripInvite[];
}
