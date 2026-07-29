import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaPartnerPlaceholder } from '@/components/travel/PrenotaPartnerPlaceholder';
import { redirect } from 'next/navigation';

export default async function PrenotaAutoPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/auto');
  }

  return (
    <PrenotaPageShell
      title="Noleggio auto"
      subtitle="Cerca auto per città e date. Prenotazione tramite partner affiliate."
      badge="Presto"
    >
      <PrenotaPartnerPlaceholder
        icon="car"
        partnerHint="In attesa delle credenziali API DiscoverCars."
      />
    </PrenotaPageShell>
  );
}
