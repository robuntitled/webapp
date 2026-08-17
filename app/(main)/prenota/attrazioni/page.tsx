import type { Metadata } from 'next';
import { auth } from '@/auth';
import { PrenotaAttractionsClient } from '@/components/travel/PrenotaAttractionsClient';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { redirect } from 'next/navigation';

/** Catalogo partner: non indicizzare (policy Viator unique content). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PrenotaAttrazioniPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/attrazioni');
  }

  return (
    <PrenotaPageShell
      title="Attrazioni"
      subtitle="Biglietti e tour. Apri su Viator e prenota."
      badge="Affiliate"
    >
      <PrenotaAttractionsClient />
    </PrenotaPageShell>
  );
}
