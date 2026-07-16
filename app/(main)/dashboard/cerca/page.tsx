import { Suspense } from 'react';
import { auth } from '@/auth';
import { fetchAllTrips } from '@/lib/data/trips';
import { TripSearchResultsClient } from '@/components/dashboard/TripSearchResultsClient';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';

export const dynamic = 'force-dynamic';

export default async function TripSearchPage() {
  const session = await auth();
  const trips = await fetchAllTrips(session?.user?.id);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, BRAND_IMAGES.heroes.slideshow[2]]}
        overlay="gradient"
      />
      <div className="relative z-0">
        <Suspense>
          <TripSearchResultsClient initialTrips={trips} session={session} />
        </Suspense>
      </div>
    </div>
  );
}