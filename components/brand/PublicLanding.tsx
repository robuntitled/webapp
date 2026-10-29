'use client';

import Link from 'next/link';
import { Map, Plane, Users } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { LandingDestinations } from '@/components/brand/LandingDestinations';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { Button } from '@/components/ui/button';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { accediHref } from '@/lib/auth/callback-url';

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

export function PublicLanding() {
  return (
    <div className="bg-stone-50 text-stone-900">
      <section className="relative isolate min-h-[100dvh] overflow-hidden">
        <HeroBackground images={BRAND_IMAGES.heroes.slideshow} overlay="photo" parallax />

        <header className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-8">
          <BrandLogo size={40} priority className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]" />
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-3.5 text-white/95 hover:bg-white/10 hover:text-white"
            >
              <Link href={accediHref()}>Accedi</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-9 rounded-full bg-accent px-3.5 font-semibold text-white hover:bg-accent/90"
            >
              <Link href={accediHref(undefined, 'register')}>Registrati</Link>
            </Button>
          </div>
        </header>

        <div className="relative z-10 flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-4 pb-16 pt-6 text-center sm:pb-20">
          <ScrollReveal variant="title" className="max-w-3xl">
            <p className="font-display text-[clamp(2.4rem,6vw,4.25rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.5)]">
              Flygetr
            </p>
            <h1 className="mt-4 font-display text-[clamp(1.35rem,2.4vw,1.85rem)] font-semibold leading-snug tracking-tight text-white/95 [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
              Il tuo viaggio senza tour operator.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[clamp(0.95rem,1.2vw,1.1rem)] leading-relaxed text-white/88 [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]">
              Itinerario ufficiale, gruppo in formazione, ognuno prenota voli e hotel per conto
              proprio.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
          </ScrollReveal>
        </div>
      </section>

      <section className="nl-page w-full py-16 sm:py-20">
        <ScrollReveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Come funziona
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Gruppo sì. Pacchetto no.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
            {COMPLIANCE_COPY.guide}
          </p>
        </ScrollReveal>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map(({ Icon, title, body }, i) => (
            <ScrollReveal key={title} variant="card" stagger={i} as="li" className="space-y-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                Passo {i + 1}
              </p>
              <h3 className="font-display text-xl font-semibold text-stone-900">{title}</h3>
              <p className="text-sm leading-relaxed text-stone-600">{body}</p>
            </ScrollReveal>
          ))}
        </ol>
      </section>

      <section className="relative overflow-hidden bg-stone-900 py-16 text-white sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 20% 20%, rgba(15,118,110,0.45), transparent), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(249,115,22,0.25), transparent)',
          }}
          aria-hidden
        />
        <div className="nl-page relative z-10 w-full">
          <ScrollReveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              Destinazioni
            </p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Parti da un itinerario ufficiale.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
              {COMPLIANCE_COPY.budgetLabel}: stime, non un prezzo del pacchetto. Ogni servizio ha
              contratto e fornitore propri.
            </p>
          </ScrollReveal>
          <LandingDestinations />
          <div className="mt-8">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/destinazioni">Vedi tutte le destinazioni</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="nl-page w-full py-16 text-center sm:py-20">
        <ScrollReveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Pronto a organizzare il viaggio?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-stone-600">
            Esplora gli itinerari o crea un account per salvare la pratica e invitare gli amici.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 rounded-full px-7 font-semibold">
              <Link href="/destinazioni">Esplora</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-stone-300 px-7 font-semibold"
            >
              <Link href={accediHref(undefined, 'register')}>Crea account</Link>
            </Button>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
