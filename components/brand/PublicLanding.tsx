'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bell, Calendar, Check, Compass, MapPin, Users } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { Button } from '@/components/ui/button';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { accediHref } from '@/lib/auth/callback-url';
import { TRAVEL_HERO_IMAGES } from '@/lib/brand/travel-heroes';
import { BRAND_NAME } from '@/lib/brand/noivia';

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

const ORGANIZZA_POINTS = [
  'Da solo, oppure con amici tramite un link privato',
  'Itinerario già pronto, da adattare alle tue date',
  'Riepilogo chiaro prima di creare il viaggio',
] as const;

const GRUPPI_POINTS = [
  'Date e itinerario già decisi',
  'Vedi quanti sono iscritti e quanto manca alla partenza',
  'Chat di gruppo per conoscersi prima di partire',
] as const;

export function PublicLanding({
  featured,
  comingSoon,
  openEditions,
  thailandia,
}: Props) {
  const thai = featured.find((d) => d.slug === 'thailandia') ?? featured[0];
  const groupCount = openEditions.length;

  return (
    <div className="overflow-x-hidden bg-white text-[var(--color-text)]">
      <section className="relative isolate flex min-h-[min(100dvh,36rem)] flex-col overflow-hidden sm:min-h-[min(100dvh,42rem)]">
        <HeroBackground
          images={[...TRAVEL_HERO_IMAGES]}
          overlay="photo"
          parallax
          intervalMs={7000}
          forceCover
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[rgba(14,17,38,0.55)] via-[rgba(14,17,38,0.35)] to-[rgba(14,17,38,0.7)]"
          aria-hidden
        />

        <header className="relative z-20 flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 sm:gap-3 sm:px-8 sm:py-4">
          <BrandLogo
            size={34}
            priority
            variant="white"
            className="drop-shadow-[0_1px_6px_rgba(0,0,0,0.3)]"
          />
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:order-last sm:ml-0 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-11 min-h-11 rounded-[10px] px-2.5 text-white/95 hover:bg-white/10 hover:text-white sm:px-3"
            >
              <Link href={accediHref()}>Accedi</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-11 min-h-11 rounded-[10px] bg-accent px-3 font-semibold text-white hover:bg-[var(--color-accent-hover)] sm:px-3.5"
            >
              <Link href={accediHref(undefined, 'register')}>Registrati</Link>
            </Button>
          </div>
          <nav
            className="flex w-full items-center justify-center gap-1 sm:w-auto sm:flex-1 sm:justify-center"
            aria-label="Navigazione principale"
          >
            <Link
              href="/organizza"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-white/95 hover:bg-white/10"
            >
              Organizza
            </Link>
            <Link
              href="/gruppi"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-white/95 hover:bg-white/10"
            >
              Gruppi
            </Link>
            <Link
              href="/pratiche"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-white/95 hover:bg-white/10"
            >
              I miei viaggi
            </Link>
          </nav>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-28 pt-6 text-center sm:pb-32">
          <div className="max-w-3xl motion-safe:animate-[nl-landing-in_700ms_ease_forwards]">
            <h1 className="font-display text-[clamp(1.75rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.25)]">
              Scegli la meta, le date e con chi partire.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[clamp(0.95rem,1.4vw,1.15rem)] leading-relaxed text-white/92">
              Al resto pensiamo noi: itinerario pronto, chat del viaggio e voli e hotel prenotati da
              te, senza tour operator.
            </p>
          </div>
        </div>
      </section>

      {/* Due percorsi equivalenti */}
      <section className="nl-page relative z-20 -mt-24 w-full pb-4 sm:-mt-28">
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <article className="flex flex-col gap-3.5 rounded-[18px] border border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-soft)]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#FDEEE9] text-accent">
              <Compass className="h-6 w-6" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              Organizza il tuo viaggio
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Scegli meta, date e con chi. Il viaggio è tuo e decidi tu chi entra.
            </p>
            <ul className="space-y-2.5">
              {ORGANIZZA_POINTS.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-[var(--color-text)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  {t}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-auto h-12 w-full rounded-[10px] bg-accent font-semibold text-white hover:bg-[var(--color-accent-hover)] sm:w-auto"
            >
              <Link href="/organizza">Organizza il tuo viaggio →</Link>
            </Button>
          </article>

          <article className="flex flex-col gap-3.5 rounded-[18px] border border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-soft)]">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--color-tint)] text-primary">
              <Users className="h-6 w-6" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">
              Unisciti a un gruppo
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Partenze già fissate, con date e budget indicativo. Viaggi insieme ad altri
              viaggiatori.
            </p>
            <ul className="space-y-2.5">
              {GRUPPI_POINTS.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-[var(--color-text)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                  {t}
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-auto h-12 w-full rounded-[10px] bg-primary font-semibold text-white hover:bg-[var(--color-primary-hover)] sm:w-auto"
            >
              <Link href="/gruppi">Vedi i gruppi →</Link>
            </Button>
          </article>
        </div>
      </section>

      {/* Disponibile ora */}
      {thai ? (
        <section className="nl-page w-full py-14 sm:py-16">
          <p className="text-[12px] font-bold uppercase tracking-[0.09em] text-accent">
            Disponibile ora
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Parti adesso per la {thai.name}
          </h2>
          <div className="mt-6 grid overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] md:grid-cols-[1.25fr_1fr]">
            <div className="relative min-h-[220px] md:min-h-[340px]">
              <Image
                src={coverForDestination(thai.slug)}
                alt={thai.name}
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 55vw"
                priority
              />
              <span className="absolute left-4 top-4 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-success)]">
                Prenotabile
              </span>
            </div>
            <div className="flex flex-col justify-center gap-3.5 p-6 sm:p-9">
              <h3 className="font-display text-2xl font-extrabold sm:text-3xl">{thai.name}</h3>
              <p className="text-[var(--color-text-secondary)]">{thai.vibe}</p>
              <div className="flex flex-wrap gap-2">
                {thai.allowedDurations?.length ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-tint)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                    <Calendar className="h-4 w-4" />
                    {thai.allowedDurations.join(', ')} giorni
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-tint)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)]">
                  <MapPin className="h-4 w-4" />
                  Bangkok e Isole
                </span>
              </div>
              {(thailandia?.budgetHint ?? thai.budgetHint) != null ? (
                <span className="inline-flex w-fit rounded-full bg-[#FDEEE9] px-3 py-1.5 text-sm font-bold text-accent">
                  stima da ~
                  {(thailandia?.budgetHint ?? thai.budgetHint)?.toLocaleString('it-IT')} € a
                  persona
                </span>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-2">
                <Button
                  asChild
                  className="rounded-[10px] bg-accent font-semibold hover:bg-[var(--color-accent-hover)]"
                >
                  <Link href={`/organizza?slug=${thai.slug}`}>Organizza</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-[10px]">
                  <Link href="/gruppi">
                    {groupCount === 1
                      ? 'Vedi 1 gruppo in partenza'
                      : groupCount > 1
                        ? `Vedi ${groupCount} gruppi in partenza`
                        : 'Vedi i gruppi'}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* In arrivo */}
      {comingSoon.length > 0 ? (
        <section className="border-t border-[var(--color-border)] bg-[var(--color-tint)]/40 py-14 sm:py-16">
          <div className="nl-page w-full">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.09em] text-[var(--color-text-secondary)]">
                  In arrivo
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Le prossime mete
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Ti avvisiamo appena diventano prenotabili.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {comingSoon.slice(0, 6).map((dest) => (
                <div
                  key={dest.slug}
                  id={`in-arrivo-${dest.slug}`}
                  className="overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-white"
                >
                  <div className="relative h-24">
                    <Image
                      src={coverForDestination(dest.slug)}
                      alt={dest.name}
                      fill
                      className="object-cover saturate-75"
                      sizes="160px"
                    />
                  </div>
                  <div className="px-3 pb-1 pt-2.5">
                    <p className="text-sm font-bold">{dest.name}</p>
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      Avvisami
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="nl-page w-full py-12 text-center sm:py-14">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {COMPLIANCE_COPY.budgetLabel} e partenze pubbliche su {BRAND_NAME}.{' '}
          {COMPLIANCE_COPY.notAPackage}
        </p>
      </section>
    </div>
  );
}
