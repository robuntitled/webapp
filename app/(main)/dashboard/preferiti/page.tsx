import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchFavoriteTrips } from '@/lib/data/trips';
import { FavoriteTripCard } from '@/components/trips/FavoriteTripCard';
import { Heart } from 'lucide-react';

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const favoriteTrips = await fetchFavoriteTrips(session.user.id);

  return (
    <div className="nl-page w-full py-12">
      <div className="flex items-center space-x-3 mb-8">
        <Heart className="h-8 w-8 text-red-500" />
        <h1 className="text-4xl font-bold">I Tuoi Viaggi Preferiti</h1>
      </div>

      {favoriteTrips.length > 0 ? (
        <div className="space-y-4">
          {favoriteTrips.map((trip) => (
            <FavoriteTripCard key={trip.id} trip={trip} session={session} />
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