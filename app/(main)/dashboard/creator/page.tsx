import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

export const metadata = {
  title: 'Per i Creator',
};

export default async function CreatorPage() {
  const session = await auth();
  if (!session?.user) redirect('/');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Per i creator</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground md:text-5xl">
          Lancia tu. Il gruppo fa il resto.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{COMPLIANCE_COPY.guide}</p>
        <ul className="mt-8 space-y-3 text-foreground">
          <li>Niente pacchetto: ognuno prenota col proprio fornitore.</li>
        </ul>
        <Button asChild className="mt-10">
          <Link href="/organizza">Scegli un itinerario</Link>
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/pratiche" className="text-primary underline underline-offset-4 hover:text-[var(--color-primary-hover)]">
            I miei viaggi
          </Link>
        </p>
      </div>
    </div>
  );
}
