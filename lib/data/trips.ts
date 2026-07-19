import 'server-only';

import { publicReadsClient, scopedForUser } from '@/lib/supabase-scoped';
import {
  getAllTrips,
  getTripById,
  getCreatedTrips,
  getJoinedTrips,
  getFavoriteTrips,
} from '@/lib/queries/trips';

/** Lista pubblica — preferisce client anon (RLS). */
export async function fetchAllTrips(userId?: string) {
  const client = await publicReadsClient();
  return getAllTrips(client, userId);
}

export async function fetchTripById(tripId: string, userId?: string) {
  const client = await publicReadsClient();
  return getTripById(client, tripId, userId);
}

export async function fetchCreatedTrips(userId: string) {
  const { db } = scopedForUser(userId);
  return getCreatedTrips(db, userId);
}

export async function fetchJoinedTrips(userId: string) {
  const { db } = scopedForUser(userId);
  return getJoinedTrips(db, userId);
}

export async function fetchFavoriteTrips(userId: string) {
  const { db } = scopedForUser(userId);
  return getFavoriteTrips(db, userId);
}
