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
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[0], BRAND_IMAGES.heroes.slideshow[2]]}
        overlay="gradient"
      />
      <div className="relative z-0 container mx-auto max-w-2xl space-y-6 px-4 py-10 pb-24">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Bacheca
          </h1>
          <p className="text-sm text-muted-foreground">
            Racconti, foto e momenti dai viaggiatori NomadLink.
          </p>
        </header>

        <CreatePostComposer />
        <PostFeed posts={posts} currentUserId={session.user.id} />
      </div>
    </div>
  );
}
