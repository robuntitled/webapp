import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { StartTripWizard } from '@/components/itineraries/StartTripWizard';
import { listOfficialEditions } from '@/lib/data/editions';
import { loadFavoriteItineraryIds } from '@/lib/data/favorites';
import { findItineraryBySlug, wizardDestinationCards } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';
import type { TravelMode } from '@/lib/itineraries/types';

function parseMode(raw?: string): TravelMode | null {
  if (raw === 'solo' || raw === 'friends' || raw === 'group') return raw;
  return null;
}

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string; mode?: string }>;
};

export default async function ItinerarioPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d, mode } = await searchParams;
  const duration = parseDurationParam(d);
  if (!findItineraryBySlug(slug, duration)) notFound();
  const session = await auth();
  const [destinations, editions, favoriteIds] = await Promise.all([
    Promise.resolve(wizardDestinationCards()),
    listOfficialEditions(),
    session?.user?.id
      ? loadFavoriteItineraryIds(session.user.id)
      : Promise.resolve(new Set<string>()),
  ]);
  return (
    <StartTripWizard
      destinations={destinations}
      favoriteTemplateIds={[...favoriteIds]}
      initialSlug={slug}
      initialDuration={duration}
      initialMode={parseMode(mode)}
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
