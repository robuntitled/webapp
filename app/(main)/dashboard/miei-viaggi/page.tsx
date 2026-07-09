import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchCreatedTrips, fetchJoinedTrips } from '@/lib/data/trips';
import { TripManagementCard } from '@/components/trips/TripManagementCard';
import Link from 'next/link';
import { BaggageClaim, PenSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MyTripsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [createdTrips, joinedTrips] = await Promise.all([
    fetchCreatedTrips(userId),
    fetchJoinedTrips(userId),
  ]);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-16">
        <div className="flex items-center space-x-3 mb-8">
          <PenSquare className="h-8 w-8 text-blue-600" />
          <h1 className="text-4xl font-bold">Viaggi che hai Creato</h1>
        </div>
        {createdTrips.length > 0 ? (
          <div className="space-y-4">
            {createdTrips.map((trip) => (
              <TripManagementCard key={trip.id} trip={trip} showActions />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 border-dashed border-2 p-8 text-center rounded-lg">
            Non hai ancora creato nessun viaggio.{' '}
            <Link href="/dashboard/crea" className="text-blue-600 hover:underline font-semibold">
              Inizia ora!
            </Link>
          </p>
        )}
      </div>
      <div>
        <div className="flex items-center space-x-3 mb-8">
          <BaggageClaim className="h-8 w-8 text-green-600" />
          <h1 className="text-4xl font-bold">Viaggi a cui Partecipi</h1>
        </div>
        {joinedTrips.length > 0 ? (
          <div className="space-y-4">
            {joinedTrips.map((trip) => (
              <TripManagementCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 border-dashed border-2 p-8 text-center rounded-lg">
            Non sei ancora iscritto a nessun viaggio.{' '}
            <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">
              Esplora le proposte!
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}