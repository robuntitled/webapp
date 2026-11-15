'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BedDouble, Bell, MapPin, Plane, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { BRAND_NAME } from '@/lib/brand';
import { formatEuro } from '@/lib/format/euro';
import { cn } from '@/lib/utils';

export type LandingDestination = {
  slug: string;
  name: string;
  vibe: string;
  emoji: string;
  published: boolean;
  allowedDurations?: number[];
  budgetHint?: number | null;
};

export type LandingEdition = {
  id: string;
  destinationName: string;
  dateFrom: string;
  dateTo: string;
  minConfirmed: number;
  confirmedCount: number;
  durationDays: number | null;
};

type Props = {
  featured: LandingDestination[];
  comingSoon: LandingDestination[];
  openEditions: LandingEdition[];
  thailandia?: {
    durationDays: number | null;
    budgetHint: number;
    budgetHint14?: number | null;
  } | null;
  isLoggedIn?: boolean;
};

const STEPS = [
  {
    icon: MapPin,
    title: '1 · Scegli meta e date',
    body: 'Da un itinerario pronto o da zero.',
  },
  {
    icon: Plane,
    title: '2 · Prenoti ogni tratta',
    body: 'Vedi prezzo a persona e totale per tratta.',
  },
  {
    icon: BedDouble,
    title: '3 · Aggiungi hotel e attività',
    body: 'Per ogni tappa, quando vuoi.',
  },
] as const;

/**
 * Home — layout allineato a mockup `home-m.png` / `home-d.png`.
 * Una sola CTA corallo per schermata; niente contatore partenze se 0 iscrivibili.
 */
export function PublicLanding({
  featured,
  comingSoon: _comingSoon,
  openEditions,
  thailandia,
  isLoggedIn: _isLoggedIn = false,
}: Props) {
  const joinableCount = openEditions.length;
  const mete = featured.slice(0, 6);

  return (
    <div
      className="overflow-x-hidden bg-[var(--color-page,#F6F7FB)] pb-24 text-[var(--color-text)] md:pb-0"
      data-testid="public-landing"
    >
      <section className="nl-page w-full pt-4 sm:pt-8">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3B4590] via-primary to-[#8A92E6] px-5 py-8 text-white shadow-[var(--shadow-soft)] sm:px-10 sm:py-12">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/80">
            Viaggio fai da te
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-[1.12] tracking-[-0.02em] text-white drop-shadow-sm">
            Il viaggio fai da te, senza fare tutto da solo.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/90 sm:text-base">
            Scegli la meta, componi l&apos;itinerario, prenota voli e hotel tratta per tratta.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              variant="cta"
              size="lg"
              className="h-12 min-h-12 rounded-[10px] px-5 text-[15px] font-bold"
              data-testid="home-cta-organizza"
            >
              <Link href="/organizza">
                <Route className="h-4 w-4" aria-hidden />
                Organizza il tuo viaggio
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-12 min-h-12 rounded-[10px] border-0 bg-white px-5 text-[15px] font-bold text-primary hover:bg-white/95"
              data-testid="home-cta-gruppi"
            >
              <Link href="/gruppi">Vedi le partenze di gruppo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="nl-page w-full py-10 sm:py-14" data-testid="home-come-funziona">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-primary">
          Come funziona
        </p>
        <h2 className="mt-1 font-display text-[22px] font-extrabold tracking-tight sm:text-2xl">
          Tre passi, tu decidi tutto
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.title}
              className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--sh-1,0_1px_2px_rgba(20,24,46,.06))]"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-tint)] text-primary">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-3 text-[15px] font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{s.body}</p>
            </li>
          ))}
        </ul>
        <Link
          href="/come-funziona"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >
          Come funziona nel dettaglio →
        </Link>
      </section>

      <section className="nl-page w-full pb-10 sm:pb-14" data-testid="home-mete">
        <h2 className="font-display text-[22px] font-extrabold tracking-tight sm:text-2xl">
          Mete con itinerario
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mete.map((dest) => (
            <Link
              key={dest.slug}
              href={`/organizza?slug=${dest.slug}`}
              className="group overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-white shadow-[var(--sh-1,0_1px_2px_rgba(20,24,46,.06))] transition hover:border-primary/30"
            >
              <div className="relative h-40 bg-[var(--color-tint)]">
                <Image
                  src={coverForDestination(dest.slug)}
                  alt={dest.name}
                  fill
                  className="object-cover transition group-hover:scale-[1.02]"
                  sizes="(max-width:640px) 100vw, 33vw"
                />
              </div>
              <div className="space-y-1.5 px-4 py-3.5">
                <p className="font-display text-lg font-extrabold">{dest.name}</p>
                {dest.slug === 'thailandia' ? (
                  <span className="inline-flex rounded-full bg-[var(--color-tint)] px-2.5 py-0.5 text-xs font-bold text-primary">
                    Itinerario da adattare
                  </span>
                ) : null}
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {dest.allowedDurations?.length
                    ? `${dest.allowedDurations.join(', ')} giorni`
                    : dest.vibe}
                  {dest.budgetHint != null
                    ? ` · ${COMPLIANCE_COPY.budgetLabel} ${formatEuro(dest.budgetHint, { approx: false })}`
                    : thailandia && dest.slug === 'thailandia'
                      ? ` · ${COMPLIANCE_COPY.budgetLabel} ${formatEuro(thailandia.budgetHint, { approx: false })}`
                      : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-5 h-11 w-full rounded-[10px] sm:w-auto">
          <Link href="/organizza">Vedi tutte le mete</Link>
        </Button>
      </section>

      <section className="nl-page w-full pb-12 sm:pb-16" data-testid="home-gruppi">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-primary">
          Partenze di gruppo
        </p>
        {joinableCount > 0 ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {joinableCount === 1
                ? '1 partenza con iscrizioni aperte.'
                : `${joinableCount} partenze con iscrizioni aperte.`}
            </p>
            <Button asChild className="h-11 rounded-[10px]">
              <Link href="/gruppi">Vedi le partenze</Link>
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              'mt-3 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5'
            )}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-tint)] text-primary">
              <Bell className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-bold">Nessuna partenza aperta ora</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Contiamo solo le partenze con iscrizioni aperte. Quelle «In arrivo» non sono ancora
              iscrivibili.
            </p>
            <Button asChild variant="outline" className="h-11 w-full rounded-[10px] sm:w-auto">
              <Link href="/gruppi">Vedi lo stato delle partenze</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="border-t border-[var(--color-border)] bg-white py-10">
        <div className="nl-page w-full space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p className="font-display text-lg font-extrabold text-primary">{BRAND_NAME}</p>
          <p>
            Organizza il tuo viaggio o unisciti a una partenza di gruppo.
          </p>
          <p className="text-xs">
            I budget sono orientativi. Ogni servizio è prenotato separatamente con il fornitore
            indicato al pagamento.
          </p>
        </div>
      </section>
    </div>
  );
}
