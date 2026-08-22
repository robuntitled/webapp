import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PraticheHub } from '@/components/itineraries/PraticheHub';
import { loadFavoriteItineraryIds } from '@/lib/data/favorites';
import { listUserPractices } from '@/lib/data/practices';

export const dynamic = 'force-dynamic';

export default async function PratichePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const [practices, liked] = await Promise.all([
    listUserPractices(session.user.id),
    loadFavoriteItineraryIds(session.user.id),
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-12">
        <PraticheHub practices={practices} likedTemplateIds={[...liked]} />
      </div>
    </div>
  );
}
