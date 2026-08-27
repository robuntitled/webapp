import { auth } from '@/auth';
import { StartTripWizard } from '@/components/itineraries/StartTripWizard';
import { listOfficialEditions } from '@/lib/data/editions';
import { loadFavoriteItineraryIds } from '@/lib/data/favorites';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';
import type { TravelMode } from '@/lib/itineraries/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ mode?: string; vista?: string }>;
};

function parseMode(raw?: string): TravelMode | null {
  if (raw === 'solo' || raw === 'friends' || raw === 'group') return raw;
  if (raw === 'partenze') return 'group';
  return null;
}

export default async function DestinazioniPage({ searchParams }: PageProps) {
  const { mode, vista } = await searchParams;
  const session = await auth();
  const [destinations, editions, favoriteIds] = await Promise.all([
    Promise.resolve(wizardDestinationCards()),
    listOfficialEditions(),
    session?.user?.id
      ? loadFavoriteItineraryIds(session.user.id)
      : Promise.resolve(new Set<string>()),
  ]);
  const initialMode = parseMode(mode) ?? (vista === 'partenze' ? 'group' : null);

  return (
    <StartTripWizard
      destinations={destinations}
      favoriteTemplateIds={[...favoriteIds]}
      initialMode={initialMode}
      editions={editions.map((e) => ({
        id: e.id,
        template_id: e.template_id,
        date_from: String(e.date_from).slice(0, 10),
        date_to: String(e.date_to).slice(0, 10),
        min_confirmed: e.min_confirmed,
        confirmed_count: e.confirmed_count ?? 0,
        status: e.status,
      }))}
    />
  );
}
