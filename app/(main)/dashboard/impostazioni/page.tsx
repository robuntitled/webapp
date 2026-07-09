import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SettingsForm from '@/app/(main)/dashboard/impostazioni/SettingsForm';
import { getUserSettings } from '@/lib/data/users';
import { getCompanyProfile } from '@/lib/privacy/company';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const [userSettings, company] = await Promise.all([
    getUserSettings(session.user.id),
    Promise.resolve(getCompanyProfile()),
  ]);

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold mb-2">Impostazioni</h1>
      <p className="text-slate-500 mb-8">
        Gestisci le impostazioni del tuo account e le preferenze.
      </p>
      <SettingsForm userSettings={userSettings} privacyEmail={company.privacyEmail} />
    </div>
  );
}