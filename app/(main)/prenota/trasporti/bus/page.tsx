import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaPartnerPlaceholder } from '@/components/travel/PrenotaPartnerPlaceholder';
import { PrenotaTransportSubnav } from '@/components/travel/PrenotaTransportSubnav';
import { redirect } from 'next/navigation';

export default async function PrenotaTrasportiBusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/trasporti/bus');
  }

  return (
    <PrenotaPageShell
      title="Bus"
      subtitle="Collegamenti in autobus. Ricerca e prenotazione tramite partner."
      badge="Presto"
    >
      <PrenotaTransportSubnav />
      <PrenotaPartnerPlaceholder
        icon="bus"
        partnerHint="In attesa dell’approvazione Omio Search API."
      />
    </PrenotaPageShell>
  );
}
