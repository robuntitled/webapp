import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { HotelCheckoutClient } from '@/components/travel/HotelCheckoutClient';
import { redirect } from 'next/navigation';

export default async function HotelCheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/hotel/checkout');
  }

  return (
    <PrenotaPageShell
      title="Checkout hotel"
      subtitle="Conferma gli ospiti e completa il pagamento in sicurezza."
      badge="Prenotabile"
    >
      <HotelCheckoutClient defaultEmail={session.user.email ?? ''} />
    </PrenotaPageShell>
  );
}
