import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { TripParticipantRole } from '@/lib/trips/roles';

const ROLE_RANK: Record<TripParticipantRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export async function getUserTripRole(
  tripId: string,
  userId: string
): Promise<TripParticipantRole | null> {
  const { data: trip } = await supabaseAdmin
    .from('trips')
    .select('creator_id')
    .eq('id', tripId)
    .single();

  if (!trip) return null;
  if (trip.creator_id === userId) return 'owner';

  const { data: participant } = await supabaseAdmin
    .from('trip_participants')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  return (participant?.role as TripParticipantRole | undefined) ?? null;
}

export async function assertTripRole(
  tripId: string,
  userId: string,
  minRole: TripParticipantRole
): Promise<void> {
  const role = await getUserTripRole(tripId, userId);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new Error('Non hai i permessi per questa azione sul viaggio.');
  }
}