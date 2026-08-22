import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { FlightCheckoutClient } from '@/components/travel/FlightCheckoutClient';
import { redirect } from 'next/navigation';

export default async function FlightCheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/voli/checkout');
  }

  return (
    <PrenotaPageShell
      title="Checkout volo"
      subtitle="Passeggeri, poi pagamento. Contratto con il fornitore."
      simple
    >
      <FlightCheckoutClient defaultEmail={session.user.email ?? ''} />
    </PrenotaPageShell>
  );
}
