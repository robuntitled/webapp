import { auth } from '../../../../auth';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '../../../../lib/supabase-admin'; // <-- IMPORT CORRETTO
import { TripCard, TripWithRelations } from '../../../../components/trips/TripCard';
import { Heart } from 'lucide-react';

// Questa funzione ora usa il client Admin per recuperare i dati
async function getFavoriteTrips(userId: string) {
  const supabase = supabaseAdmin; // <-- CLIENT CORRETTO

  // Step 1: Trova tutti gli ID dei viaggi che l'utente ha messo tra i preferiti
  const { data: favoriteRelations, error: favError } = await supabase
    .from('favorite_trips')
    .select('trip_id')
    .eq('user_id', userId);

  if (favError) {
    console.error("Errore nel recuperare i preferiti:", favError);
    return [];
  }
  if (!favoriteRelations || favoriteRelations.length === 0) {
    return [];
  }
  const tripIds = favoriteRelations.map(fav => fav.trip_id);

  // Step 2: Ora recuperiamo tutti i dettagli dei viaggi che corrispondono a quegli ID
  const { data: trips, error: tripsError } = await supabase
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
      creator:users(*),
      favorite_trips(user_id)
    `)
    .in('id', tripIds)
    .order('createdAt', { ascending: false });

  if (tripsError) {
    console.error("Errore nel recuperare i dettagli dei viaggi preferiti:", tripsError);
    return [];
  }

  return trips;
}

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const favoriteTrips = await getFavoriteTrips(session.user.id);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center space-x-3 mb-8">
        <Heart className="h-8 w-8 text-red-500" />
        <h1 className="text-4xl font-bold">I Tuoi Viaggi Preferiti</h1>
      </div>

      {favoriteTrips.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoriteTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip as TripWithRelations} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg mt-8">
          <p className="text-xl font-semibold">Non hai ancora nessun viaggio preferito.</p>
          <p className="text-slate-500 mt-2">
            Clicca sul cuore nelle card dei viaggi per aggiungerli qui!
          </p>
        </div>
      )}
    </div>
  );
}