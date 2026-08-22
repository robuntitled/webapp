import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listCommunityPhotoPins } from '@/lib/data/community-map';
import { CreatePostComposer } from '@/components/social/CreatePostComposer';
import { CommunityMapSection } from '@/components/social/CommunityMapSection';
import { SlideshowWash } from '@/components/brand/SlideshowWash';

export const dynamic = 'force-dynamic';

export default async function BachecaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/dashboard/bacheca');
  }

  const photoPins = await listCommunityPhotoPins(200);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <SlideshowWash />
      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-6 px-4 py-10 pb-24">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Community
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Bacheca
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-white/75">
            Solo le foto che pubblicate, sul posto in cui sono state scattate.
          </p>
        </header>

        <CreatePostComposer
          compact
          tone="onDark"
          placeholder="Scrivi un testo. La foto va sulla mappa."
        />
        <CommunityMapSection photoPins={photoPins} />
      </div>
    </div>
  );
}
