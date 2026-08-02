'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BedDouble,
  Compass,
  Plane,
  Sparkles,
  Users,
  MapPinned,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import {
  guidedStepIndex,
  type GuidedJourneyState,
  type GuidedStepId,
} from '@/lib/dashboard/guided-journey';

type GuidedHomeProps = {
  firstName: string;
  journey: GuidedJourneyState;
};

function stepCopy(step: GuidedStepId, journey: GuidedJourneyState) {
  const tripTitle = journey.primaryTrip?.title || journey.primaryTrip?.destination;
  switch (step) {
    case 'choose':
      return {
        eyebrow: 'Il tuo percorso',
        title: 'Come vuoi partire?',
        body: 'Scegli un percorso. Ti guidiamo uno step alla volta — senza dispersioni.',
      };
    case 'build':
      return {
        eyebrow: 'Step 2 · Crea',
        title: journey.draftDestination
          ? `Continua ${journey.draftDestination}`
          : 'Crea il tuo viaggio',
        body: 'Hai una bozza aperta. Finisci destinazione, date e piano — poi pubblica.',
      };
    case 'invite':
      return {
        eyebrow: 'Step 3 · Invita',
        title: tripTitle ? `Chiama gli amici per ${tripTitle}` : 'Invita la crew',
        body: 'Il viaggio è pronto. Condividi il link: loro entrano in modalità relax.',
      };
    case 'book':
      return {
        eyebrow: 'Step 4 · Prenota',
        title: tripTitle ? `Prenota per ${tripTitle}` : 'Prenota voli e hotel',
        body: 'Date e destinazione sono già nel viaggio. Completa voli e hotel da lì.',
      };
    case 'travel':
      return {
        eyebrow: 'Step 5 · Parti',
        title: tripTitle ? `${tripTitle} è in corso` : 'Vivi il viaggio',
        body: 'Sei in viaggio. Usa la chat del gruppo e i dettagli itinerario.',
      };
  }
}

export function GuidedHome({ firstName, journey }: GuidedHomeProps) {
  const currentIndex = guidedStepIndex(journey.currentStep);
  const copy = stepCopy(journey.currentStep, journey);
  const tripHref = journey.primaryTrip ? `/viaggi/${journey.primaryTrip.id}` : null;

  return (
    <div className="relative z-0 container mx-auto px-4 pt-10 pb-24 max-w-4xl">
      <div className="text-center mb-10">
        <ScrollReveal variant="decor">
          <p className="text-accent font-medium text-sm uppercase tracking-widest mb-3">
            {copy.eyebrow}
          </p>
        </ScrollReveal>
        <ScrollReveal variant="title">
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-white leading-tight">
            {firstName ? `Ciao ${firstName}` : 'Ciao'}
            <span className="block text-white/90 mt-1">{copy.title}</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="title" stagger={1}>
          <p className="mt-4 text-lg text-white/65 max-w-2xl mx-auto">{copy.body}</p>
        </ScrollReveal>
      </div>

      {/* Progress */}
      <ScrollReveal variant="card">
        <ol className="mb-10 grid grid-cols-5 gap-1 sm:gap-2">
          {journey.steps.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={step.id} className="min-w-0">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    done || active ? 'bg-accent' : 'bg-white/15'
                  }`}
                />
                <p
                  className={`mt-2 text-[10px] sm:text-xs font-medium truncate ${
                    active ? 'text-accent' : done ? 'text-white/70' : 'text-white/35'
                  }`}
                >
                  <span className="hidden sm:inline">{i + 1}. </span>
                  {step.shortLabel}
                </p>
              </li>
            );
          })}
        </ol>
      </ScrollReveal>

      {/* Step content */}
      {journey.currentStep === 'choose' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <PathCard
            href="/dashboard/crea?new=1"
            icon={Sparkles}
            title="Organizzo io"
            description="Crea destinazione, date e itinerario con l’AI. Poi inviti chi vuoi."
            cta="Inizia a creare"
            delay={0}
          />
          <PathCard
            href="/dashboard/scopri"
            icon={Compass}
            title="Mi unisco"
            description="Scopri viaggi aperti già organizzati e parti in modalità relax."
            cta="Scopri viaggi"
            delay={0.08}
          />
        </div>
      ) : (
        <ScrollReveal variant="card">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
          >
            <StepActions journey={journey} tripHref={tripHref} />
          </motion.div>
        </ScrollReveal>
      )}

      {/* Secondary shortcuts — only after first choice */}
      {journey.currentStep !== 'choose' ? (
        <ScrollReveal variant="card" stagger={1}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
            <Link
              href="/dashboard/scopri"
              className="rounded-full px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Scopri altri viaggi
            </Link>
            <Link
              href="/dashboard/miei-viaggi"
              className="rounded-full px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              I miei viaggi
            </Link>
            {journey.currentStep !== 'build' ? (
              <Link
                href="/dashboard/crea?new=1"
                className="rounded-full px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                Nuovo viaggio
              </Link>
            ) : null}
          </div>
        </ScrollReveal>
      ) : null}
    </div>
  );
}

function PathCard({
  href,
  icon: Icon,
  title,
  description,
  cta,
  delay,
}: {
  href: string;
  icon: typeof Compass;
  title: string;
  description: string;
  cta: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Link
        href={href}
        className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-7 transition-colors hover:border-accent/40 hover:bg-white/[0.07]"
      >
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-white/60">{description}</p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}

function StepActions({
  journey,
  tripHref,
}: {
  journey: GuidedJourneyState;
  tripHref: string | null;
}) {
  switch (journey.currentStep) {
    case 'build':
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <MapPinned className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-display text-xl font-semibold text-white">
                Bozza{journey.draftDestination ? `: ${journey.draftDestination}` : ''}
              </p>
              <p className="mt-1 text-sm text-white/60">
                Riprendi da dove hai lasciato. Pubblica quando il piano ti convince.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="rounded-full gap-2">
              <Link href="/dashboard/crea?resume=1">
                Continua la bozza
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/dashboard/crea?new=1">Ricomincia da zero</Link>
            </Button>
          </div>
        </div>
      );
    case 'invite':
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <Users className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-display text-xl font-semibold text-white">
                Invita chi deve venire
              </p>
              <p className="mt-1 text-sm text-white/60">
                Mandagli il link del viaggio. Si iscrivono senza dover pianificare.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="rounded-full gap-2">
              <Link href={tripHref || '/dashboard/miei-viaggi'}>
                Apri viaggio e invita
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href="/dashboard/miei-viaggi">I miei viaggi</Link>
            </Button>
          </div>
        </div>
      );
    case 'book':
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <Plane className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-display text-xl font-semibold text-white">
                Prenota dal viaggio
              </p>
              <p className="mt-1 text-sm text-white/60">
                Voli e hotel con date già allineate al tuo itinerario.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="rounded-full gap-2">
              <Link href={tripHref ? `${tripHref}#prenota` : '/dashboard/miei-viaggi'}>
                <BedDouble className="h-4 w-4" />
                Vai a prenotare
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
              <Link href={tripHref || '/dashboard/miei-viaggi'}>Dettaglio viaggio</Link>
            </Button>
          </div>
        </div>
      );
    case 'travel':
      return (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <Compass className="mt-1 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-display text-xl font-semibold text-white">Sei in viaggio</p>
              <p className="mt-1 text-sm text-white/60">
                Itinerario, chat e dettagli sono nel tuo viaggio attivo.
              </p>
            </div>
          </div>
          <Button asChild className="rounded-full gap-2">
            <Link href={tripHref || '/dashboard/miei-viaggi'}>
              Apri il viaggio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      );
    default:
      return null;
  }
}
