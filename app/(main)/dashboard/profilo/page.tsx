import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ProfilePageClient } from '@/components/profile/ProfilePageClient';
import { getPlannerProfile } from '@/lib/data/planner-profile';
import { getUserProfile } from '@/lib/data/users';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const [userProfile, plannerProfile] = await Promise.all([
    getUserProfile(session.user.id),
    getPlannerProfile(session.user.id),
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 pb-24">
        <ProfilePageClient
          userProfile={userProfile}
          plannerProfile={plannerProfile}
          displayEmail={session.user.email}
        />
      </div>
    </div>
  );
}