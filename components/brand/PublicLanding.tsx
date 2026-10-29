'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Map, Plane, Users } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { Button } from '@/components/ui/button';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { accediHref } from '@/lib/auth/callback-url';
import { itineraryPath } from '@/lib/itineraries/params';
import { formatEditionDateRange } from '@/lib/itineraries/dates';
import { TRAVEL_HERO_IMAGES } from '@/lib/brand/travel-heroes';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    Icon: Map,
    title: 'Scegli l’itinerario',
    body: 'Template ufficiali giorno per giorno: stessa struttura, zero pacchetto turistico.',
  },
  {
    Icon: Users,
    title: 'Forma il gruppo',
    body: 'Parti da solo, invita amici o unisciti a una partenza in formazione.',
  },
  {
    Icon: Plane,
    title: 'Prenota per conto tuo',
    body: 'Voli e hotel li prenoti tu, ai prezzi di mercato, quando la soglia del gruppo è solida.',
  },
] as const;

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
    durationDays: number;
    budgetHint: number;
  } | null;
};

export function PublicLanding({
  featured,
  comingSoon,
  openEditions,
  thailandia,
}: Props) {
  const openCount = openEditions.length;
  const spotsHint = openEditions.reduce(
    (acc, e) => acc + Math.max(0, e.minConfirmed - e.confirmedCount),
    0
  );

  return (
    <div className="overflow-x-hidden bg-stone-50 text-stone-900">
      <section className="relative isolate flex min-h-[min(100dvh,40rem)] flex-col overflow-hidden sm:min-h-[100dvh]">
        <HeroBackground
          images={[...TRAVEL_HERO_IMAGES]}
          overlay="photo"
          parallax
          intervalMs={7000}
          forceCover
        />
        {/* Gradiente verticale leggero per AA sul testo, senza letterbox scuro */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-stone-950/45 via-stone-950/15 to-stone-950/55"
          aria-hidden
        />

        <header className="relative z-20 flex items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-8 sm:py-4">
          <BrandLogo size={36} priority className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]" />
          <nav
            className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-1"
            aria-label="Navigazione principale"
          >
            <Link
              href="/destinazioni"
              className="rounded-full px-2.5 py-1.5 text-xs font-medium text-white/95 hover:bg-white/10 sm:px-3 sm:text-sm"
            >
              Destinazioni
            </Link>
            <Link
              href="/partenze"
              className="rounded-full px-2.5 py-1.5 text-xs font-medium text-white/95 hover:bg-white/10 sm:px-3 sm:text-sm"
            >
              Partenze
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-2.5 text-white/95 hover:bg-white/10 hover:text-white sm:px-3"
            >
              <Link href={accediHref()}>Accedi</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9 rounded-full bg-accent px-3 font-semibold text-white hover:bg-accent/90 sm:px-3.5"
            >
              <Link href={accediHref(undefined, 'register')}>Registrati</Link>
            </Button>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-4 text-center sm:pb-20 sm:pt-6">
          <div className="max-w-3xl motion-safe:animate-[nl-landing-in_700ms_ease_forwards]">
            <p className="font-display text-[clamp(2.1rem,7vw,4rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.55)]">
              Flygetr
            </p>
            <h1 className="mt-3 font-display text-[clamp(1.2rem,2.6vw,1.85rem)] font-semibold leading-snug tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.5)] sm:mt-4">
              Il tuo viaggio senza tour operator.
            </h1>
            <p className="mx-auto mt-2.5 max-w-xl text-[clamp(0.9rem,1.2vw,1.05rem)] leading-relaxed text-white/92 [text-shadow:0_1px_12px_rgba(0,0,0,0.45)] sm:mt-3">
              Itinerario ufficiale, gruppo in formazione, ognuno prenota voli e hotel per conto
              proprio.
            </p>
            {thailandia ? (
              <p className="mx-auto mt-4 inline-flex max-w-lg flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-white/35 bg-black/35 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
                <span className="font-semibold">Thailandia</span>
                <span className="text-white/70">·</span>
                <span>
                  {thailandia.durationDays} giorni · {COMPLIANCE_COPY.budgetLabel.toLowerCase()} da{' '}
                  ~{thailandia.budgetHint}&nbsp;€
                </span>
              </p>
            ) : null}
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-accent px-7 text-base font-semibold text-white shadow-[0_16px_40px_-16px_rgba(249,115,22,0.85)] hover:bg-accent/90"
              >
                <Link href="/destinazioni">Esplora i viaggi</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/70 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
              >
                <Link href="/partenze">Unisciti a una partenza</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="nl-page w-full py-14 sm:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Come funziona
        </p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Gruppo sì. Pacchetto no.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
          {COMPLIANCE_COPY.guide}
        </p>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li
              key={title}
              className="space-y-3 motion-reduce:!animate-none"
              style={{
                animation: `nl-landing-in 600ms ease ${i * 80}ms forwards`,
              }}
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Passo {i + 1}
              </p>
              <h3 className="font-display text-xl font-semibold text-stone-900">{title}</h3>
              <p className="text-sm leading-relaxed text-stone-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {openCount > 0 ? (
        <section className="border-y border-stone-200/80 bg-white py-10 sm:py-12">
          <div className="nl-page w-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              Partenze in formazione
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              {openCount === 1
                ? '1 partenza aperta ora'
                : `${openCount} partenze aperte ora`}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-stone-600">
              Dati reali dalle partenze pubbliche
              {spotsHint > 0
                ? ` — ancora posti verso la soglia del gruppo su ${spotsHint} slot.`
                : '.'}
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {openEditions.slice(0, 3).map((ed) => (
                <li key={ed.id}>
                  <Link
                    href={`/partenze/${ed.id}`}
                    className="block rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 transition hover:border-primary/35 hover:bg-white"
                  >
                    <p className="font-semibold text-stone-900">{ed.destinationName}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {formatEditionDateRange(ed.dateFrom, ed.dateTo)}
                      {ed.durationDays ? ` · ${ed.durationDays} giorni` : ''}
                    </p>
                    <p className="mt-1 text-xs font-medium text-primary">
                      {ed.confirmedCount} di {ed.minConfirmed} verso la soglia
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/partenze">Vedi tutte le partenze</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden bg-stone-900 py-14 text-white sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 20% 20%, rgba(15,118,110,0.45), transparent), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(249,115,22,0.25), transparent)',
          }}
          aria-hidden
        />
        <div className="nl-page relative z-10 w-full !text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Destinazioni
          </p>
          <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight !text-white sm:text-4xl">
            Parti da un itinerario ufficiale.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed !text-white/90">
            {COMPLIANCE_COPY.budgetLabel}: stime, non un prezzo del pacchetto. Ogni servizio ha
            contratto e fornitore propri.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((dest) => (
              <Link
                key={dest.slug}
                href={itineraryPath(dest.slug)}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-left backdrop-blur-sm transition hover:border-white/40',
                  dest.published && 'sm:col-span-2 lg:col-span-1 ring-1 ring-accent/40'
                )}
              >
                <div className={cn('relative', dest.published ? 'h-44 sm:h-52' : 'h-36')}>
                  <Image
                    src={coverForDestination(dest.slug)}
                    alt={dest.name}
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <span
                    className={cn(
                      'absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white',
                      dest.published ? 'bg-emerald-600/95' : 'bg-amber-500/95'
                    )}
                  >
                    {dest.published ? 'Disponibile ora' : 'Presto'}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="truncate text-base font-semibold text-white">
                    {dest.emoji} {dest.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/80">{dest.vibe}</p>
                  {dest.published && dest.allowedDurations?.length ? (
                    <p className="mt-2 text-xs font-medium text-white/90">
                      {dest.allowedDurations.join(' / ')} giorni
                      {dest.budgetHint != null
                        ? ` · ${COMPLIANCE_COPY.budgetLabel.toLowerCase()} da ~${dest.budgetHint} €`
                        : ''}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
            {comingSoon.slice(0, Math.max(2, 3 - featured.length)).map((dest) => (
              <Link
                key={dest.slug}
                href="/destinazioni"
                className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-left"
              >
                <div className="relative h-36">
                  <Image
                    src={coverForDestination(dest.slug)}
                    alt={dest.name}
                    fill
                    className="object-cover opacity-90"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Presto
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">
                    {dest.emoji} {dest.name}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-white/75">{dest.vibe}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/destinazioni">Vedi tutte le destinazioni</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="nl-page w-full py-14 pb-[max(3.5rem,calc(var(--cookie-banner-pad,0px)+2rem))] text-center sm:py-20 sm:pb-[max(5rem,calc(var(--cookie-banner-pad,0px)+2.5rem))]">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-stone-900 opacity-100 sm:text-4xl">
          Pronto a organizzare il viaggio?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-base text-stone-600 opacity-100">
          Esplora gli itinerari o crea un account per salvare la pratica e invitare gli amici.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 opacity-100 sm:flex-row">
          <Button asChild size="lg" className="h-12 rounded-full px-7 font-semibold">
            <Link href="/destinazioni">Esplora</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-stone-300 px-7 font-semibold text-stone-900"
          >
            <Link href={accediHref(undefined, 'register')}>Crea account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
