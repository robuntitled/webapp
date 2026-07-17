import { auth } from '@/auth';
import { fetchAllTrips } from '@/lib/data/trips';
import DashboardClient from '@/app/(main)/dashboard/DashboardClient';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  const trips = await fetchAllTrips(session?.user?.id);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, ...BRAND_IMAGES.heroes.slideshow.slice(1, 4)]}
        overlay="gradient"
      />
      <DashboardClient initialTrips={trips} session={session} />
    </div>
  );
}