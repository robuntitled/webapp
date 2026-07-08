import Image from 'next/image';
import { createClient } from '../../../lib/supabase-server';
import DashboardClient from './DashboardClient';
import { TripWithRelations } from '../../../components/trips/TripCard';
import { auth } from '../../../auth';
import { type Session } from 'next-auth';

export default async function DashboardPage() {
  const session = await auth();
  const supabase = createClient();
  const userId = session?.user?.id;

  const { data: trips, error } = await supabase
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
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Errore nel recuperare i viaggi dal server:', error);
  }

  const tripsWithFavorites = trips?.map(trip => ({
    ...trip,
    isFavorited: trip.favorite_trips.some(fav => fav.user_id === userId)
  })) || [];

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="fixed inset-0 -z-10">
        <Image src="/images/dashboard-background.jpg" alt="Sfondo dashboard" fill style={{ objectFit: 'cover' }} />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <DashboardClient initialTrips={tripsWithFavorites as TripWithRelations[]} session={session} />
    </div>
  );
}