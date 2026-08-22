import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SettingsPageClient } from '@/components/settings/SettingsPageClient';
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
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full py-10 pb-24">
        <SettingsPageClient
          userSettings={userSettings}
          privacyEmail={company.privacyEmail}
        />
      </div>
    </div>
  );
}