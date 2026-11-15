import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PraticheHub } from '@/components/itineraries/PraticheHub';
import { loadFavoriteItineraryIds } from '@/lib/data/favorites';
import { listUserPractices } from '@/lib/data/practices';
import { enrichPracticesForHub } from '@/lib/itineraries/pratiche-hub';
import { pageOpenGraph } from '@/lib/brand/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'I miei viaggi',
  description: 'I tuoi viaggi organizzati e le partenze a cui ti sei unito.',
  alternates: { canonical: '/pratiche' },
  robots: { index: false, follow: false },
  openGraph: pageOpenGraph(
    '/pratiche',
    'I miei viaggi',
    'I tuoi viaggi organizzati e le partenze a cui ti sei unito.'
  ),
};

export default async function PratichePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/accedi?callbackUrl=${encodeURIComponent('/pratiche')}`);
  }
  const [practices, liked] = await Promise.all([
    listUserPractices(session.user.id),
    loadFavoriteItineraryIds(session.user.id),
  ]);
  const hubPractices = await enrichPracticesForHub(session.user.id, practices);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full space-y-8 py-12">
        <PraticheHub practices={hubPractices} likedTemplateIds={[...liked]} />
      </div>
    </div>
  );
}
