import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ProfilePageClient } from '@/components/profile/ProfilePageClient';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { getPlannerProfile } from '@/lib/data/planner-profile';
import { getUserProfile } from '@/lib/data/users';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const [userProfile, plannerProfile] = await Promise.all([
    getUserProfile(session.user.id),
    getPlannerProfile(session.user.id),
  ]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[2], BRAND_IMAGES.heroes.slideshow[4]]}
        overlay="gradient"
      />
      <div className="relative z-0 mx-auto w-full max-w-4xl px-4 py-10 pb-24">
        <ProfilePageClient
          userProfile={userProfile}
          plannerProfile={plannerProfile}
          displayEmail={session.user.email}
        />
      </div>
    </div>
  );
}