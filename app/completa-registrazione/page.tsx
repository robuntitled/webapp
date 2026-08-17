import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CompletaRegistrazioneForm } from '@/app/completa-registrazione/CompletaRegistrazioneForm';

export const metadata = {
  title: 'Completa registrazione — NomadLink',
};

export default async function CompletaRegistrazionePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }
  if (session.user.privacyConsentAccepted) {
    redirect(session.user.onboardingCompleted ? '/dashboard' : '/onboarding');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
      <CompletaRegistrazioneForm />
    </main>
  );
}