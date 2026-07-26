import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaPlacesClient } from '@/components/travel/PrenotaPlacesClient';
import { redirect } from 'next/navigation';

export default async function PrenotaAttrazioniPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/attrazioni');
  }

  return (
    <PrenotaPageShell
      title="Attrazioni"
      subtitle="Scopri luoghi e punti di interesse (Google Places). La prenotazione ticket partner arriverà dopo."
    >
      <PrenotaPlacesClient category="attraction" title="Attrazioni" />
    </PrenotaPageShell>
  );
}
