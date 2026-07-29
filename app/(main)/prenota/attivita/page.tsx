import { auth } from '@/auth';
import { PrenotaActivitiesClient } from '@/components/travel/PrenotaActivitiesClient';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { redirect } from 'next/navigation';

export default async function PrenotaAttivitaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/attivita');
  }

  return (
    <PrenotaPageShell
      title="Attività"
      subtitle="Tour ed esperienze prenotabili via Viator. Apri sul sito partner per completare la prenotazione."
      badge="Affiliate"
    >
      <PrenotaActivitiesClient />
    </PrenotaPageShell>
  );
}
