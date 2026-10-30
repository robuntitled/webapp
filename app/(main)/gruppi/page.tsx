import type { Metadata } from 'next';
import { GruppiHub } from '@/components/itineraries/GruppiHub';
import { listJoinableEditions } from '@/lib/data/editions';
import { BRAND_NAME } from '@/lib/brand/noivia';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gruppi',
  description:
    'Unisciti a un gruppo con date già fissate e budget orientativo. Prenota il tuo volo quando vuoi.',
  openGraph: {
    title: `Gruppi — ${BRAND_NAME}`,
    description:
      'Partenze pubbliche in formazione. Soglia = voli confermati. Budget orientativo, non prezzo del gruppo.',
  },
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
