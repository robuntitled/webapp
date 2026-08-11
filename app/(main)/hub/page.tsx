import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { HubClient } from '@/components/hub/HubClient';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { ROUTES } from '@/lib/nav/routes';

export const dynamic = 'force-dynamic';

export default async function HubPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`${ROUTES.home}?callbackUrl=${encodeURIComponent(ROUTES.hub)}`);
  }

  const firstName =
    session.user.name?.trim().split(/\s+/)[0] ||
    session.user.email?.split('@')[0] ||
    '';

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.dashboard, ...BRAND_IMAGES.heroes.slideshow.slice(0, 3)]}
        overlay="gradient"
        parallax
      />
      <HubClient firstName={firstName} />
    </div>
  );
}
