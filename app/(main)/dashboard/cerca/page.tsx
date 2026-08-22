import { Suspense } from 'react';
import { auth } from '@/auth';
import { fetchAllTrips } from '@/lib/data/trips';
import { TripSearchResultsClient } from '@/components/dashboard/TripSearchResultsClient';

export const dynamic = 'force-dynamic';

export default async function TripSearchPage() {
  const session = await auth();
  const trips = await fetchAllTrips(session?.user?.id);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div>
        <Suspense>
          <TripSearchResultsClient initialTrips={trips} session={session} />
        </Suspense>
      </div>
    </div>
  );
}