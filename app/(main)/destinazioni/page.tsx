import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { StartTripWizard } from '@/components/itineraries/StartTripWizard';
import { listOfficialEditions } from '@/lib/data/editions';
import { loadFavoriteItineraryIds } from '@/lib/data/favorites';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ vista?: string; dest?: string; modalita?: string }>;
};

export default async function DestinazioniPage({ searchParams }: PageProps) {
  const { vista } = await searchParams;
  if (vista === 'partenze' || vista === 'unisciti') {
    redirect('/partenze');
  }
  const session = await auth();
  const [destinations, editions, favoriteIds] = await Promise.all([
    Promise.resolve(wizardDestinationCards()),
    listOfficialEditions(),
    session?.user?.id
      ? loadFavoriteItineraryIds(session.user.id)
      : Promise.resolve(new Set<string>()),
  ]);
  return (
    <Suspense fallback={null}>
      <StartTripWizard
        destinations={destinations}
        favoriteTemplateIds={[...favoriteIds]}
        editions={editions.map((e) => ({
          id: e.id,
          template_id: e.template_id,
          date_from: String(e.date_from).slice(0, 10),
          date_to: String(e.date_to).slice(0, 10),
          min_confirmed: e.min_confirmed,
          confirmed_count: e.confirmed_count ?? 0,
          interested_count: e.interested_count ?? 0,
          status: e.status,
          edition_type: e.edition_type,
        }))}
      />
    </Suspense>
  );
}
