import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaFlightsClient } from '@/components/travel/PrenotaFlightsClient';
import { redirect } from 'next/navigation';

export default async function PrenotaVoliPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/voli');
  }

  return (
    <PrenotaPageShell
      title="Voli"
      subtitle="Ricerca tariffe LiteAPI (Nuitee Connect Flights). In sandbox usa date future e tratte comuni (es. ROM → Londra)."
    >
      <PrenotaFlightsClient />
    </PrenotaPageShell>
  );
}
