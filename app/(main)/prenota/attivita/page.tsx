import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaPlacesClient } from '@/components/travel/PrenotaPlacesClient';
import { redirect } from 'next/navigation';

export default async function PrenotaAttivitaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/attivita');
  }

  return (
    <PrenotaPageShell
      title="Attività"
      subtitle="Tour ed esperienze nell’area. Checkout ticket in arrivo; intanto esplora e apri la mappa."
      badge="Scoperta"
    >
      <PrenotaPlacesClient category="activity" title="Attività" />
    </PrenotaPageShell>
  );
}
