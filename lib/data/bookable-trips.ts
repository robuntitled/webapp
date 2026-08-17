import 'server-only';

import { fetchCreatedTrips, fetchJoinedTrips } from '@/lib/data/trips';
import { canBookTripServices } from '@/lib/trips/formation';
import type { TripWithRelations } from '@/types/trip';

export async function fetchBookableTripsForUser(userId: string): Promise<TripWithRelations[]> {
  const [created, joined] = await Promise.all([
    fetchCreatedTrips(userId),
    fetchJoinedTrips(userId),
  ]);
  const seen = new Set<string>();
  const out: TripWithRelations[] = [];
  for (const trip of [...created, ...joined]) {
    if (seen.has(trip.id) || !canBookTripServices(trip)) continue;
    seen.add(trip.id);
    out.push(trip);
  }
  return out;
}
