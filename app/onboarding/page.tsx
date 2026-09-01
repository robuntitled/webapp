import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export const metadata = {
  title: 'Inizio — Flygetr',
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
    redirect('/destinazioni');
  }

  return (
    <div className="relative min-h-screen">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, ...BRAND_IMAGES.heroes.slideshow.slice(0, 2)]}
        overlay="gradient"
      />
      <header className="relative z-10 px-4 py-5">
        <Link href="/" className="inline-block" aria-label="Flygetr — home">
          <BrandLogo size={48} className="ring-white/40" />
        </Link>
      </header>
      <OnboardingWizard />
    </div>
  );
}
