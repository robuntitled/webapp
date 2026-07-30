import type { Metadata } from 'next';
import { auth } from '@/auth';
import { OmioSearchWidget } from '@/components/travel/OmioSearchWidget';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaTransportSubnav } from '@/components/travel/PrenotaTransportSubnav';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PrenotaTrasportiBusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/trasporti/bus');
  }

  return (
    <PrenotaPageShell
      title="Bus"
      subtitle="Autobus e pullman in Europa. Ricerca su NomadLink · prenotazione Omio."
      badge="Omio"
    >
      <PrenotaTransportSubnav />
      <OmioSearchWidget mode="bus" />
    </PrenotaPageShell>
  );
}
