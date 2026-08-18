import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import { formatCreatorCashback, formatParticipantCashback } from '@/lib/commerce/cashback';

export const metadata = {
  title: 'Per i Creator — NomadLink',
};

export default async function CreatorPage() {
  const session = await auth();
  if (!session?.user) redirect('/');

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground images={[BRAND_IMAGES.heroes.dashboard]} overlay="gradient" />
      <div className="relative z-10 container mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Per i creator</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white md:text-5xl">
          Lancia tu. Il cashback è più alto.
        </h1>
        <p className="mt-4 text-lg text-white/90">
          Nei primi 6–12 mesi chi crea il viaggio accumula {formatCreatorCashback()} in NomadCredits
          sulle prenotazioni del gruppo. Chi si unisce {formatParticipantCashback()}. I servizi si
          prenotano solo a gruppo formato, ognuno con il suo fornitore.
        </p>
        <ul className="mt-8 space-y-3 text-white/90">
          <li>Parti da un template: pochi minuti, itinerario già strutturato.</li>
          <li>Pubblichi in formazione. Il viaggio parte al raggiungimento del minimo posti.</li>
          <li>Niente markup da tour operator: prezzi di mercato dai fornitori.</li>
        </ul>
        <Button asChild className="mt-10 rounded-full">
          <Link href="/dashboard/crea?new=1">Crea un viaggio</Link>
        </Button>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
          <Link href="/dashboard/punti" className="underline underline-offset-4">
            I miei NomadPoints
          </Link>
          <Link href="/dashboard/cashback" className="underline underline-offset-4">
            I miei NomadCredits
          </Link>
        </p>
      </div>
    </div>
  );
}
