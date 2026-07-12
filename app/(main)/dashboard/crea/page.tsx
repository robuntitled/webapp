import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TripComposer } from '@/components/composer/TripComposer';
import { getUserProfile } from '@/lib/data/users';

export default async function CreateTripPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const profile = await getUserProfile(session.user.id);

  return (
    <TripComposer
      profileCity={profile?.address_city}
      profileCountry={profile?.country}
    />
  );
}