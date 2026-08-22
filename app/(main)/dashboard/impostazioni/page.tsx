import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SettingsPageClient } from '@/components/settings/SettingsPageClient';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
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
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[5], BRAND_IMAGES.heroes.slideshow[1]]}
        overlay="gradient"
      />
      <div className="relative z-0 mx-auto w-full max-w-4xl px-4 py-10 pb-24">
        <SettingsPageClient
          userSettings={userSettings}
          privacyEmail={company.privacyEmail}
        />
      </div>
    </div>
  );
}