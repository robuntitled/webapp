import type { Metadata } from 'next';
import { GruppiHub } from '@/components/itineraries/GruppiHub';
import { pageOpenGraph } from '@/lib/brand/seo';
import { listJoinableEditions } from '@/lib/data/editions';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Partenze di gruppo con itinerario pronto: guarda date e budget orientativo e unisciti al gruppo.';

export const metadata: Metadata = {
  title: 'Gruppi',
  description: DESCRIPTION,
  alternates: { canonical: '/gruppi' },
  openGraph: pageOpenGraph(
    '/gruppi',
    'Gruppi',
    'Guarda le partenze di gruppo e unisciti a un viaggio.'
  ),
};

export default async function GruppiPage() {
  const editions = await listJoinableEditions();
  return (
    <GruppiHub
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
