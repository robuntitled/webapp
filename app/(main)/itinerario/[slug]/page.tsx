import { notFound } from 'next/navigation';
import { StartTripWizard } from '@/components/itineraries/StartTripWizard';
import { listOfficialEditions } from '@/lib/data/editions';
import { findItineraryBySlug, publishedDestinations } from '@/lib/itineraries/catalog';
import { parseDurationParam } from '@/lib/itineraries/params';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
};

export default async function ItinerarioPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d } = await searchParams;
  const duration = parseDurationParam(d);
  if (!findItineraryBySlug(slug, duration)) notFound();
  const [destinations, editions] = await Promise.all([
    Promise.resolve(publishedDestinations()),
    listOfficialEditions(),
  ]);
  return (
    <StartTripWizard
      destinations={destinations}
      initialSlug={slug}
      initialDuration={duration}
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
