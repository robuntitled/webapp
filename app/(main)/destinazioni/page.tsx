import { CatalogHome } from '@/components/itineraries/CatalogHome';
import { listOfficialEditions } from '@/lib/data/editions';
import { publishedDestinations } from '@/lib/itineraries/catalog';

export const dynamic = 'force-dynamic';

export default async function DestinazioniPage() {
  const [destinations, editions] = await Promise.all([
    Promise.resolve(publishedDestinations()),
    listOfficialEditions(),
  ]);
  return <CatalogHome destinations={destinations} editions={editions} />;
}
