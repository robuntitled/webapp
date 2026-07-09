import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TripComposer } from '@/components/composer/TripComposer';

export default async function CreateTripPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  return <TripComposer />;
}