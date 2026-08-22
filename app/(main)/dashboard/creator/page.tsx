import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { POINTS } from '@/lib/commerce/points';

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
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground md:text-5xl">
          Lancia tu. I punti premiano le azioni.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{COMPLIANCE_COPY.guide}</p>
        <p className="mt-3 text-foreground">
          Crei un Trip: +{POINTS.create_trip_published.points} punti. Soglia del gruppo: +
          {POINTS.group_formed.points} (×3 nei primi 90 giorni e per i Founding Creator). I primi 50
          Trip alla soglia: badge permanente, ×3 e boost 14 giorni.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{COMPLIANCE_COPY.pointsNoMoney}</p>
        <ul className="mt-8 space-y-3 text-foreground">
          <li>Parti da un template: pochi minuti, itinerario già strutturato.</li>
          <li>Pubblichi in formazione. Il viaggio parte alla soglia del gruppo.</li>
          <li>Niente markup da tour operator: ognuno prenota col proprio fornitore.</li>
        </ul>
        <Button asChild className="mt-10">
          <Link href="/destinazioni">Scegli un itinerario</Link>
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/dashboard/punti" className="text-primary underline underline-offset-4 hover:text-[var(--color-primary-hover)]">
            I miei NomadPoints
          </Link>
        </p>
      </div>
    </div>
  );
}
