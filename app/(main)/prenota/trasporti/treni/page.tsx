import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaPartnerPlaceholder } from '@/components/travel/PrenotaPartnerPlaceholder';
import { PrenotaTransportSubnav } from '@/components/travel/PrenotaTransportSubnav';
import { redirect } from 'next/navigation';

export default async function PrenotaTrasportiTreniPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/trasporti/treni');
  }

  return (
    <PrenotaPageShell
      title="Treni"
      subtitle="Biglietti ferroviari. Ricerca e prenotazione tramite partner."
      badge="Presto"
    >
      <PrenotaTransportSubnav />
      <PrenotaPartnerPlaceholder
        icon="train"
        partnerHint="In attesa dell’approvazione Omio Search API."
      />
    </PrenotaPageShell>
  );
}
