import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getAllTrips,
  getTripById,
  getCreatedTrips,
  getJoinedTrips,
  getFavoriteTrips,
} from '@/lib/queries/trips';

export async function fetchAllTrips(userId?: string) {
  return getAllTrips(supabaseAdmin, userId);
}

export async function fetchTripById(tripId: string, userId?: string) {
  return getTripById(supabaseAdmin, tripId, userId);
}

export async function fetchCreatedTrips(userId: string) {
  return getCreatedTrips(supabaseAdmin, userId);
}

export async function fetchJoinedTrips(userId: string) {
  return getJoinedTrips(supabaseAdmin, userId);
}

export async function fetchFavoriteTrips(userId: string) {
  return getFavoriteTrips(supabaseAdmin, userId);
}