import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ProfileForm from '@/app/(main)/dashboard/profilo/ProfileForm';
import { getUserProfile } from '@/lib/data/users';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userProfile = await getUserProfile(session.user.id);

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">Il Tuo Profilo</h1>
      <ProfileForm userProfile={userProfile} />
    </div>
  );
}