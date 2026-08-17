import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export const metadata = {
  title: 'Inizio — NomadLink',
};

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }
  if (!session.user.privacyConsentAccepted) {
    redirect('/completa-registrazione');
  }
  if (session.user.onboardingCompleted) {
    redirect('/dashboard');
  }

  return (
    <div className="relative min-h-screen">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, ...BRAND_IMAGES.heroes.slideshow.slice(0, 2)]}
        overlay="gradient"
      />
      <header className="relative z-10 flex items-center gap-2.5 px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/assets/logo.png" alt="NomadLink" width={32} height={32} className="rounded-lg" />
          <span className="font-display text-lg font-semibold text-white">NomadLink</span>
        </Link>
      </header>
      <OnboardingWizard />
    </div>
  );
}
