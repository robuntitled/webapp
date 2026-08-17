import { auth } from '@/auth';
import { PrenotaPageShell } from '@/components/travel/PrenotaPageShell';
import { PrenotaCarsClient } from '@/components/travel/PrenotaCarsClient';
import { redirect } from 'next/navigation';

export default async function PrenotaAutoPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/prenota/auto');
  }

  return (
    <PrenotaPageShell
      title="Noleggio auto"
      subtitle="Città o aeroporto, tariffe chiare, pagamento al ritiro."
      badge="Duffel"
    >
      <PrenotaCarsClient
        defaultEmail={session.user.email ?? ''}
        defaultName={session.user.name ?? ''}
      />
    </PrenotaPageShell>
  );
}
