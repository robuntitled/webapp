import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchCreatedTrips, fetchJoinedTrips } from '@/lib/data/trips';
import { getComposerDraft } from '@/lib/data/planner-profile';
import { MyTripsHub } from '@/components/trips/MyTripsHub';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';

export const dynamic = 'force-dynamic';

export default async function MyTripsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [createdTrips, joinedTrips, composerDraft] = await Promise.all([
    fetchCreatedTrips(userId),
    fetchJoinedTrips(userId),
    getComposerDraft(userId),
  ]);

  const draftPayload = composerDraft
    ? {
        draft: composerDraft.draft,
        currentStep: composerDraft.currentStep,
        updatedAt: composerDraft.updatedAt,
      }
    : null;

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[1], BRAND_IMAGES.heroes.slideshow[3]]}
        overlay="gradient"
      />

      <div className="relative z-0 container mx-auto px-4 py-10 pb-24 max-w-5xl">
        <MyTripsHub
          createdTrips={createdTrips}
          joinedTrips={joinedTrips}
          composerDraft={draftPayload}
        />
      </div>
    </div>
  );
}