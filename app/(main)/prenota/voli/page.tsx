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
      subtitle="Cerca voli da una città, un aeroporto o un intero paese. Destinazione libera: città o codice IATA."
    >
      <PrenotaFlightsClient />
    </PrenotaPageShell>
  );
}
