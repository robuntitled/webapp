import { notFound, redirect } from 'next/navigation';
import { getPublicProfile } from '@/lib/data/public-profile';
import { profilePath } from '@/lib/profile/paths';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ userId: string }>;
};

/** Fallback se manca username: risolve e redirect a /u/handle. */
export default async function PublicProfileByIdPage({ params }: PageProps) {
  const { userId } = await params;
  const profile = await getPublicProfile(userId);
  if (!profile) notFound();

  const href = profilePath(profile.username, profile.id);
  if (href) redirect(href);
  notFound();
}
