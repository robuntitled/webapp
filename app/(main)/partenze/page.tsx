import { UniscitiHub } from '@/components/itineraries/UniscitiHub';
import { listJoinableEditions } from '@/lib/data/editions';

export const dynamic = 'force-dynamic';

export default async function PartenzeIndexPage() {
  const editions = await listJoinableEditions();
  return (
    <UniscitiHub
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
  );
}
