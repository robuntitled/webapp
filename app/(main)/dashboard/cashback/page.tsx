import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import {
  formatCreatorCashback,
  formatParticipantCashback,
} from '@/lib/commerce/cashback';
import { listCashbackForUser, sumPendingAndEarned } from '@/lib/commerce/cashback-ledger';

export const metadata = {
  title: 'I miei crediti — NomadLink',
};

export default async function CashbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const rows = await listCashbackForUser(session.user.id);
  const total = sumPendingAndEarned(rows);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground images={[BRAND_IMAGES.heroes.dashboard]} overlay="gradient" />
      <div className="relative z-10 container mx-auto max-w-2xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Cashback</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">I miei crediti</h1>
        <p className="mt-4 text-lg text-white/90">
          Partecipante {formatParticipantCashback()} · Creator {formatCreatorCashback()} nei primi
          mesi. Il credito resta in attesa fino al viaggio (clawback se cancelli).
        </p>
        <p className="mt-6 font-display text-5xl font-semibold tabular-nums text-white">
          {total.toFixed(2)} €
        </p>
        <p className="mt-1 text-sm text-white/80">in attesa o maturato</p>

        {rows.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/90">
            Nessun credito ancora. Prenota i servizi da un viaggio con gruppo formato.
          </p>
        ) : (
          <ul className="mt-8 space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              >
                <span>
                  {row.service} · {row.booking_ref}
                  <span className="ml-2 text-white/70">{row.status}</span>
                </span>
                <span className="tabular-nums font-medium">+{Number(row.credit_eur).toFixed(2)} €</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link href="/dashboard/creator">Per i Creator</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard/miei-viaggi">I miei viaggi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
