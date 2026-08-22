import { StartTripWizard } from '@/components/itineraries/StartTripWizard';
import { listOfficialEditions } from '@/lib/data/editions';
import { wizardDestinationCards } from '@/lib/itineraries/catalog';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ vista?: string }>;
};

export default async function DestinazioniPage({ searchParams }: PageProps) {
  const { vista } = await searchParams;
  const [destinations, editions] = await Promise.all([
    Promise.resolve(wizardDestinationCards()),
    listOfficialEditions(),
  ]);
  return (
    <StartTripWizard
      destinations={destinations}
      initialHomeView={vista === 'partenze' ? 'partenze' : 'itinerari'}
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
