import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type TripMessageRow = {
  id: string;
  trip_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user: {
    id: string;
    username?: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
  } | null;
};

export async function isTripMember(tripId: string, userId: string): Promise<boolean> {
  const { data: trip } = await supabaseAdmin
    .from('trips')
    .select('creator_id')
    .eq('id', tripId)
    .single();

  if (!trip) return false;
  if (trip.creator_id === userId) return true;

  const { data: participant } = await supabaseAdmin
    .from('trip_participants')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!participant;
}

export async function getTripMessages(
  tripId: string,
  since?: string
): Promise<TripMessageRow[]> {
  let query = supabaseAdmin
    .from('trip_messages')
    .select(
      'id, trip_id, user_id, body, created_at, user:users(id, username, first_name, last_name, image)'
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    user: Array.isArray(row.user) ? row.user[0] ?? null : row.user,
  })) as TripMessageRow[];
}

export async function postTripMessage(
  tripId: string,
  userId: string,
  body: string
): Promise<TripMessageRow> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Messaggio vuoto');

  const member = await isTripMember(tripId, userId);
  if (!member) throw new Error('Non fai parte di questo viaggio');

  const { data, error } = await supabaseAdmin
    .from('trip_messages')
    .insert({ trip_id: tripId, user_id: userId, body: trimmed })
    .select(
      'id, trip_id, user_id, body, created_at, user:users(id, username, first_name, last_name, image)'
    )
    .single();

  if (error) throw new Error(error.message);

  const row = data as TripMessageRow & { user: TripMessageRow['user'] | TripMessageRow['user'][] };
  return {
    ...row,
    user: Array.isArray(row.user) ? row.user[0] ?? null : row.user,
  };
}