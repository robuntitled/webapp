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
      subtitle="Esplora punti di interesse con foto e mappe. I ticket partner arriveranno dopo."
      badge="Scoperta"
    >
      <PrenotaPlacesClient category="attraction" title="Attrazioni" />
    </PrenotaPageShell>
  );
}
