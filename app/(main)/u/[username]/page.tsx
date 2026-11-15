import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  getExistingReview,
  getPublicJoinedTrips,
  getPublicOrganizedTrips,
  getPublicProfile,
  getPublicReviews,
  haveSharedTravel,
} from '@/lib/data/public-profile';
import { listUserPosts } from '@/lib/data/posts';
import { PublicProfileView } from '@/components/profile/PublicProfileView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profilo',
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ username: string }>;
};

/** P0-16 / PRO: only logged-in viewers; noindex; privacy-softened in PublicProfileView. */
export default async function PublicProfilePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    const { username } = await params;
    redirect(`/accedi?callbackUrl=${encodeURIComponent(`/u/${username}`)}`);
  }

  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const profile = await getPublicProfile(decoded);
  if (!profile) notFound();

  const viewerId = session.user.id;

  const [organizedTrips, joinedTrips, reviews, shared, alreadyReviewed, posts] =
    await Promise.all([
      getPublicOrganizedTrips(profile.id),
      getPublicJoinedTrips(profile.id),
      getPublicReviews(profile.id),
      viewerId !== profile.id
        ? haveSharedTravel(viewerId, profile.id)
        : Promise.resolve(false),
      viewerId !== profile.id
        ? getExistingReview(profile.id, viewerId)
        : Promise.resolve(false),
      listUserPosts(profile.id, viewerId, 30),
    ]);

  const canReview = Boolean(
    viewerId !== profile.id && shared && !alreadyReviewed
  );

  return (
    <PublicProfileView
      profile={profile}
      organizedTrips={organizedTrips}
      joinedTrips={joinedTrips}
      reviews={reviews}
      posts={posts}
      viewerId={viewerId}
      isOwn={viewerId === profile.id}
      canReview={canReview}
    />
  );
}
