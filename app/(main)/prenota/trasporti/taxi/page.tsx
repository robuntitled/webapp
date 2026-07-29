import type { Metadata } from 'next';
import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaTransferClient } from '@/components/travel/PrenotaTransferClient';
import { PrenotaTransportSubnav } from '@/components/travel/PrenotaTransportSubnav';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PrenotaTrasportiTaxiPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/trasporti/taxi');
  }

  return (
    <PrenotaPageShell
      title="Taxi"
      subtitle="Transfer privati e taxi aeroporto. Ricerca su NomadLink · pagamento GetTransfer."
      badge="GetTransfer"
    >
      <PrenotaTransportSubnav />
      <PrenotaTransferClient />
    </PrenotaPageShell>
  );
}
