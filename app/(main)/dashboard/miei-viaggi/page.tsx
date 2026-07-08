import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase-server';
import { TripManagementCard } from '../../../../components/trips/TripManagementCard';
import { type TripWithRelations } from '../../../../components/trips/TripCard';
import Link from 'next/link';
import { BaggageClaim, PenSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Funzione per prendere i viaggi creati dall'utente
async function getCreatedTrips(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      id, title, destination, description, price,
      startDate: start_date, 
      endDate: end_date, 
      minParticipants: min_participants, 
      maxParticipants: max_participants, 
      minAge: min_age, 
      maxAge: max_age, 
      imageUrl: image_url,
      creator:users(id, first_name, last_name, image),
      favorite_trips(user_id)
    `)
    .eq('creator_id', userId)
    .order('createdAt', { ascending: false });
  
  if (error) {
    console.error('Errore recupero viaggi creati:', error.message);
    return [];
  }
  return data;
}

// Funzione per prendere i viaggi a cui l'utente partecipa
async function getJoinedTrips(supabase: any, userId: string) {
  const { data: participations, error: pError } = await supabase
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userId);

  if (pError || !participations || participations.length === 0) {
    if (pError) console.error('Errore recupero partecipazioni:', pError.message);
    return [];
  }
  const tripIds = participations.map(p => p.trip_id);

  const { data, error } = await supabase
    .from('trips')
    .select(`
      id, title, destination, description, price,
      startDate: start_date, 
      endDate: end_date, 
      minParticipants: min_participants, 
      maxParticipants: max_participants, 
      minAge: min_age, 
      maxAge: max_age, 
      imageUrl: image_url,
      creator:users(id, first_name, last_name, image),
      favorite_trips(user_id)
    `)
    .in('id', tripIds)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Errore recupero viaggi a cui si partecipa:', error.message);
    return [];
  }
  return data;
}

const mapFavorites = (trips: any[], userId: string | undefined) => {
  if (!userId || !Array.isArray(trips)) return [];
  return trips.map(trip => ({
    ...trip,
    isFavorited: trip.favorite_trips.some((fav: any) => fav.user_id === userId)
  }));
};

export default async function MyTripsPage() {
  const session = await auth();
  if (!session?.user?.id) { redirect('/'); }
  const userId = session.user.id;
  const supabase = createClient();

  const [createdTripsRaw, joinedTripsRaw] = await Promise.all([
    getCreatedTrips(supabase, userId),
    getJoinedTrips(supabase, userId)
  ]);

  const createdTrips = mapFavorites(createdTripsRaw, userId);
  const joinedTrips = mapFavorites(joinedTripsRaw, userId);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-16">
        <div className="flex items-center space-x-3 mb-8"><PenSquare className="h-8 w-8 text-blue-600" /><h1 className="text-4xl font-bold">Viaggi che hai Creato</h1></div>
        {createdTrips.length > 0 ? (
          <div className="space-y-4">{createdTrips.map((trip) => (<TripManagementCard key={trip.id} trip={trip as TripWithRelations} showActions={true} />))}</div>
        ) : (<p className="text-slate-500 border-dashed border-2 p-8 text-center rounded-lg">Non hai ancora creato nessun viaggio. <Link href="/dashboard/crea" className="text-blue-600 hover:underline font-semibold">Inizia ora!</Link></p>)}
      </div>
      <div>
        <div className="flex items-center space-x-3 mb-8"><BaggageClaim className="h-8 w-8 text-green-600" /><h1 className="text-4xl font-bold">Viaggi a cui Partecipi</h1></div>
        {joinedTrips.length > 0 ? (
          <div className="space-y-4">{joinedTrips.map((trip) => (<TripManagementCard key={trip.id} trip={trip as TripWithRelations} />))}</div>
        ) : (<p className="text-slate-500 border-dashed border-2 p-8 text-center rounded-lg">Non sei ancora iscritto a nessun viaggio. <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">Esplora le proposte!</Link></p>)}
      </div>
    </div>
  );
}