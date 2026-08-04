import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listFeedPosts } from '@/lib/data/posts';
import { CreatePostComposer } from '@/components/social/CreatePostComposer';
import { PostFeed } from '@/components/social/PostFeed';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';

export const dynamic = 'force-dynamic';

export default async function BachecaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/dashboard/bacheca');
  }

  const posts = await listFeedPosts(session.user.id, 50);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[0], BRAND_IMAGES.heroes.slideshow[2]]}
        overlay="gradient"
      />
      <div className="nl-feed-shell pointer-events-none absolute inset-0 -z-0" />

      <div className="nl-hero-chrome relative z-0 container mx-auto max-w-2xl space-y-7 px-4 py-10 pb-28">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Community
          </p>
          <h1 className="nl-hero-title font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Bacheca
          </h1>
          <p className="nl-hero-subtitle max-w-md text-base leading-relaxed">
            Racconti, foto e momenti dai viaggiatori NomadLink.
          </p>
        </header>

        <CreatePostComposer tone="onDark" />
        <PostFeed
          posts={posts}
          currentUserId={session.user.id}
          tone="onDark"
        />
      </div>
    </div>
  );
}
