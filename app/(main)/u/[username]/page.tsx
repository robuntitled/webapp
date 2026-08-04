import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import {
  getExistingReview,
  getPublicJoinedTrips,
  getPublicOrganizedTrips,
  getPublicProfile,
  getPublicReviews,
  haveSharedTrip,
} from '@/lib/data/public-profile';
import { listUserPosts } from '@/lib/data/posts';
import { PublicProfileView } from '@/components/profile/PublicProfileView';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const profile = await getPublicProfile(decoded);
  if (!profile) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;

  const [organizedTrips, joinedTrips, reviews, shared, alreadyReviewed, posts] =
    await Promise.all([
      getPublicOrganizedTrips(profile.id),
      getPublicJoinedTrips(profile.id),
      getPublicReviews(profile.id),
      viewerId && viewerId !== profile.id
        ? haveSharedTrip(viewerId, profile.id)
        : Promise.resolve(false),
      viewerId && viewerId !== profile.id
        ? getExistingReview(profile.id, viewerId)
        : Promise.resolve(false),
      listUserPosts(profile.id, viewerId, 30),
    ]);

  const canReview = Boolean(
    viewerId && viewerId !== profile.id && shared && !alreadyReviewed
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
