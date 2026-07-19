import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import {
  getPublicOrganizedTrips,
  getPublicProfile,
} from '@/lib/data/public-profile';
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

  const [trips, session] = await Promise.all([
    getPublicOrganizedTrips(profile.id),
    auth(),
  ]);

  return (
    <PublicProfileView
      profile={profile}
      trips={trips}
      isOwn={session?.user?.id === profile.id}
    />
  );
}
