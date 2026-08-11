import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { ROUTES } from '@/lib/nav/routes';
import { MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MessaggiPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`${ROUTES.home}?callbackUrl=${encodeURIComponent(ROUTES.messaggi)}`);
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[3], BRAND_IMAGES.heroes.slideshow[1]]}
        overlay="gradient"
      />
      <div className="relative z-0 container mx-auto px-4 py-12 pb-24 max-w-2xl">
        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-8 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 mb-4">
            <MessageCircle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">Messaggi</h1>
          <p className="mt-3 text-white/70 leading-relaxed">
            Le chat dei tuoi viaggi restano collegate a ogni trip. Usa il dock in basso a destra
            oppure apri la conversazione dal{' '}
            <Link href={ROUTES.iMiei} className="text-accent underline-offset-2 hover:underline">
              dettaglio in I miei
            </Link>
            .
          </p>
          <p className="mt-4 text-sm text-white/50">
            Inbox unificata in arrivo: per ora l’ingresso principale è dal viaggio e dal dock.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={ROUTES.iMiei}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-white/90 transition"
            >
              Vai ai miei viaggi
            </Link>
            <Link
              href={ROUTES.hub}
              className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition"
            >
              Torna all’hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
