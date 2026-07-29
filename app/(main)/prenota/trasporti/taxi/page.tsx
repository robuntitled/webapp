import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaPartnerPlaceholder } from '@/components/travel/PrenotaPartnerPlaceholder';
import { PrenotaTransportSubnav } from '@/components/travel/PrenotaTransportSubnav';
import { redirect } from 'next/navigation';

export default async function PrenotaTrasportiTaxiPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/trasporti/taxi');
  }

  return (
    <PrenotaPageShell
      title="Taxi"
      subtitle="Transfer e taxi aeroporto / città. Partner in valutazione."
      badge="Presto"
    >
      <PrenotaTransportSubnav />
      <PrenotaPartnerPlaceholder
        icon="taxi"
        partnerHint="In attesa di un partner API transfer (es. GetTransfer)."
      />
    </PrenotaPageShell>
  );
}
