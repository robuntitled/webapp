import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listCommunityPhotoPins } from '@/lib/data/community-map';
import { CreatePostComposer } from '@/components/social/CreatePostComposer';
import { CommunityMapSection } from '@/components/social/CommunityMapSection';

export const dynamic = 'force-dynamic';

export default async function BachecaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/?callbackUrl=/dashboard/bacheca');
  }

  const photoPins = await listCommunityPhotoPins(200);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full space-y-6 py-10 pb-24">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Community
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Bacheca
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Solo le foto che pubblicate, sul posto in cui sono state scattate.
          </p>
        </header>

        <CreatePostComposer
          compact
          placeholder="Scrivi un testo. La foto va sulla mappa."
        />
        <CommunityMapSection photoPins={photoPins} />
      </div>
    </div>
  );
}
