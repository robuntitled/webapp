import type { SupabaseClient } from '@supabase/supabase-js';
import type { TripWithRelations } from '@/types/trip';

export const TRIP_LIST_SELECT = `
  id, title, destination, description, price,
  startDate: start_date,
  endDate: end_date,
  minParticipants: min_participants,
  maxParticipants: max_participants,
  minAge: min_age,
  maxAge: max_age,
  planningMode: planning_mode,
  imageUrl: image_url,
  creator:users(id, first_name, last_name, image),
  favorite_trips(user_id)
`;

export const TRIP_DETAIL_SELECT = `
  id, title, destination, description, price,
  startDate: start_date,
  endDate: end_date,
  minParticipants: min_participants,
  maxParticipants: max_participants,
  minAge: min_age,
  maxAge: max_age,
  planningMode: planning_mode,
  imageUrl: image_url,
  creator_id,
  creator:users(id, first_name, last_name, image),
  favorite_trips(user_id),
  trip_participants(user_id, role, user:users(id, first_name, last_name, image))
`;

type RawTrip = Omit<TripWithRelations, 'isFavorited'> & {
  favorite_trips?: { user_id: string }[];
};

export function mapTripsWithFavorites(
  trips: RawTrip[] | null | undefined,
  userId?: string
): TripWithRelations[] {
  if (!trips) return [];

  return trips.map((trip) => ({
    ...trip,
    isFavorited: userId
      ? (trip.favorite_trips?.some((fav) => fav.user_id === userId) ?? false)
      : false,
  }));
}

export async function getAllTrips(supabase: SupabaseClient, userId?: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_LIST_SELECT)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Errore nel recuperare i viaggi:', error);
    return [];
  }

  return mapTripsWithFavorites(data as unknown as RawTrip[], userId);
}

export async function getTripById(supabase: SupabaseClient, tripId: string, userId?: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_DETAIL_SELECT)
    .eq('id', tripId)
    .single();

  if (error || !data) {
    console.error('Errore nel recuperare il viaggio:', error);
    return null;
  }

  const [trip] = mapTripsWithFavorites([data as unknown as RawTrip], userId);
  return trip ?? null;
}

export async function getCreatedTrips(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_LIST_SELECT)
    .eq('creator_id', userId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Errore recupero viaggi creati:', error.message);
    return [];
  }

  return mapTripsWithFavorites(data as unknown as RawTrip[], userId);
}

export async function getJoinedTrips(supabase: SupabaseClient, userId: string) {
  const { data: participations, error: pError } = await supabase
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userId);

  if (pError || !participations?.length) {
    if (pError) console.error('Errore recupero partecipazioni:', pError.message);
    return [];
  }

  const tripIds = participations.map((p) => p.trip_id);

  const { data, error } = await supabase
    .from('trips')
    .select(TRIP_LIST_SELECT)
    .in('id', tripIds)
    .neq('creator_id', userId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Errore recupero viaggi a cui si partecipa:', error.message);
    return [];
  }

  return mapTripsWithFavorites(data as unknown as RawTrip[], userId);
}

export async function getFavoriteTrips(supabase: SupabaseClient, userId: string) {
  const { data: favoriteRelations, error: favError } = await supabase
    .from('favorite_trips')
    .select('trip_id')
    .eq('user_id', userId);

  if (favError || !favoriteRelations?.length) {
    if (favError) console.error('Errore nel recuperare i preferiti:', favError);
    return [];
  }

  const tripIds = favoriteRelations.map((fav) => fav.trip_id);

  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select(`${TRIP_LIST_SELECT}, trip_participants(user_id)`)
    .in('id', tripIds)
    .order('createdAt', { ascending: false });

  if (tripsError) {
    console.error('Errore nel recuperare i dettagli dei viaggi preferiti:', tripsError);
    return [];
  }

  return mapTripsWithFavorites(trips as unknown as RawTrip[], userId).map((trip) => ({
    ...trip,
    isFavorited: true,
  }));
}