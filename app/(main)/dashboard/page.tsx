import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { GuidedHome } from '@/components/dashboard/GuidedHome';
import { resolveGuidedJourney, type GuidedTripSummary } from '@/lib/dashboard/guided-journey';
import { getComposerDraft } from '@/lib/data/planner-profile';
import { fetchCreatedTrips, fetchJoinedTrips } from '@/lib/data/trips';

export const dynamic = 'force-dynamic';

function toSummary(
  trip: {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    participantCount?: number;
  },
  isOwner: boolean
): GuidedTripSummary {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    participantCount: trip.participantCount ?? 1,
    isOwner,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/dashboard/scopri');
  }

  const userId = session.user.id;
  const [createdTrips, joinedTrips, composerDraft] = await Promise.all([
    fetchCreatedTrips(userId),
    fetchJoinedTrips(userId),
    getComposerDraft(userId),
  ]);

  const draftDestination = composerDraft?.draft?.destination?.trim() || null;
  const journey = resolveGuidedJourney({
    hasDraft: Boolean(draftDestination),
    draftDestination,
    organizing: createdTrips.map((t) => toSummary(t, true)),
    joined: joinedTrips.map((t) => toSummary(t, false)),
  });

  const firstName =
    session.user.name?.trim().split(/\s+/)[0] ||
    session.user.email?.split('@')[0] ||
    '';

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, ...BRAND_IMAGES.heroes.slideshow.slice(1, 4)]}
        overlay="gradient"
        parallax
      />
      <GuidedHome firstName={firstName} journey={journey} />
    </div>
  );
}
