'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, User, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { TripWhenPicker, type TripWhenSelection } from '@/components/itineraries/TripWhenPicker';
import { uniqueCoversForSlugs } from '@/lib/composer/destination-covers';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import {
  CatalogHeroSearchBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { DestinationExplorerPanel } from '@/components/itineraries/DestinationExplorerPanel';
import { HomePathSelector } from '@/components/itineraries/HomePathSelector';
import { PlanSaveButton } from '@/components/itineraries/PlanSaveButton';
import { ItineraryDaysWithMap } from '@/components/itineraries/ItineraryWorldMap';
import { findItineraryBySlug, minBudgetHintForDestination, templatesForDestination } from '@/lib/itineraries/catalog';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';
import type { OfficialEditionCard, TravelMode } from '@/lib/itineraries/types';

type Step = 'dest' | 'plan' | 'when';

const FLOW_STEPS: Step[] = ['dest', 'plan', 'when'];

const phaseMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

export function StartTripWizard({
  destinations,
  editions: _editions,
  initialSlug,
  initialDuration,
  favoriteTemplateIds = [],
}: {
  destinations: {
    slug: string;
    name: string;
    vibe: string;
    emoji: string;
    allowedDurations: number[];
    continent?: string;
    published?: boolean;
  }[];
  editions: OfficialEditionCard[];
  initialSlug?: string;
  initialDuration?: number;
  initialHomeTravelMode?: string;
  initialPublicDest?: string;
  favoriteTemplateIds?: string[];
}) {
  const startTemplate = initialSlug
    ? findItineraryBySlug(initialSlug, initialDuration)
    : undefined;
  const [step, setStep] = useState<Step>(startTemplate ? 'plan' : 'dest');
  const [slug, setSlug] = useState(startTemplate?.destination_slug ?? '');
  const [duration, setDuration] = useState(startTemplate?.duration_days ?? 0);
  const [mode, setMode] = useState<TravelMode>('solo');
  const [whenSelection, setWhenSelection] = useState<TripWhenSelection | null>(null);
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);
  const [pending, startTransition] = useTransition();
  const { data: session } = useSession();
  const router = useRouter();

  const template = slug && duration ? findItineraryBySlug(slug, duration) : undefined;
  const idx = FLOW_STEPS.indexOf(step);

  const filteredDestinations = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return destinations.filter((d) => {
      if (filters.continent !== 'Tutte' && d.continent !== filters.continent) return false;
      if (filters.duration != null && !d.allowedDurations.includes(filters.duration)) return false;
      if (filters.priceMax != null) {
        const minBudget = minBudgetHintForDestination(d.slug);
        if (minBudget != null && minBudget > filters.priceMax) return false;
      }
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.vibe.toLowerCase().includes(q) ||
        (d.continent ?? '').toLowerCase().includes(q)
      );
    });
  }, [destinations, filters]);

  const destCoverBySlug = useMemo(() => {
    const slugs = filteredDestinations.map((d) => d.slug);
    const urls = uniqueCoversForSlugs(slugs);
    return Object.fromEntries(slugs.map((s, i) => [s, urls[i]]));
  }, [filteredDestinations]);

  const durationOptions = useMemo(
    () =>
      [...new Set(destinations.flatMap((d) => d.allowedDurations))].sort((a, b) => a - b),
    [destinations]
  );

  const pickDuration = (dest: (typeof destinations)[number], days: number) => {
    if (dest.published === false) {
      toast.error('Presto. Ora parti da Thailandia.');
      return;
    }
    setSlug(dest.slug);
    setDuration(days);
    setStep('plan');
  };

  const openDestination = (dest: (typeof destinations)[number]) => {
    const preferred =
      filters.duration != null && dest.allowedDurations.includes(filters.duration)
        ? filters.duration
        : dest.allowedDurations[Math.min(1, dest.allowedDurations.length - 1)] ??
          dest.allowedDurations[0];
    if (!preferred) {
      toast.error('Presto. Ora parti da Thailandia.');
      return;
    }
    pickDuration(dest, preferred);
  };

  const goBack = () => {
    const prev = FLOW_STEPS[idx - 1];
    if (prev) setStep(prev);
  };

  const confirm = () => {
    if (!template) return;
    if (!session?.user) {
      toast.error('Accedi per aprire il viaggio.');
      router.push(
        `/?callbackUrl=${encodeURIComponent(
          `/itinerario/${template.destination_slug}?d=${template.duration_days}`
        )}`
      );
      return;
    }
    if (!whenSelection) {
      toast.error('Scegli partenza e rientro (o almeno la partenza).');
      return;
    }
    startTransition(async () => {
      const result = await startPracticeAction({
        templateId: whenSelection.template.template_id,
        mode: mode === 'friends' ? 'friends' : 'solo',
        dateFrom: format(whenSelection.dateFrom, 'yyyy-MM-dd'),
        dateTo: format(whenSelection.dateTo, 'yyyy-MM-dd'),
      });
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <div
      className={cn(
        'composer-shell relative min-h-[calc(100vh-4rem)] bg-white',
        step === 'dest' ? 'overflow-visible' : 'overflow-hidden'
      )}
    >
      {step === 'dest' ? (
        <section className="relative isolate -mt-[var(--nl-nav-height)] flex h-[min(38vh,22rem)] min-h-[16rem] flex-col overflow-visible pt-[var(--nl-nav-height)] sm:h-[min(46vh,28rem)] sm:min-h-[20rem]">
          <div className="absolute inset-0 overflow-hidden">
            <HeroBackground
              images={BRAND_IMAGES.heroes.slideshow}
              overlay="dark"
              className="!z-0"
              intervalMs={6500}
            />
          </div>
          <div className="relative z-10 nl-page flex w-full flex-1 flex-col items-center justify-center gap-2 pb-7 pt-3 text-center sm:gap-3 sm:pb-8 sm:pt-4">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow sm:text-3xl md:text-5xl">
              La tua vacanza, in tre click
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-snug text-white/90 drop-shadow sm:text-[19px] md:text-[22px]">
              Scegli la destinazione, definisci date e stile, configura il viaggio.
            </p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-1/2">
            <div className="nl-page pointer-events-auto w-full">
              <CatalogHeroSearchBar
                value={filters}
                onChange={setFilters}
                placeholder="Cerca nazione, continente o vibe"
                resultsId="risultati-itinerari"
                durationOptions={durationOptions}
              />
            </div>
          </div>
        </section>
      ) : null}

      <div
        className={cn(
          'relative z-10 flex w-full flex-col pb-24',
          step === 'dest' ? 'min-h-0 pt-16' : 'min-h-[calc(100vh-4rem)] pt-6',
          step === 'dest' ? 'nl-home-content' : 'nl-page'
        )}
      >
        {step === 'dest' ? (
          <div className="mb-6 flex w-full flex-col items-center">
            <HomePathSelector value="destinazioni" />
          </div>
        ) : null}

        {step !== 'dest' ? (
          <div className="mb-8 space-y-3 text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              {step === 'plan' && 'Questo è il piano.'}
              {step === 'when' && 'Quando parti?'}
            </h1>
            <p className="mx-auto max-w-xl text-base text-slate-600">
              {step === 'plan' && 'Riferimento, non pacchetto. Poi scegli date e stile.'}
              {step === 'when' && 'Scegli le date e la vibe — il piano si adatta.'}
            </p>
          </div>
        ) : null}

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 'dest' ? (
              <motion.div key="dest" {...phaseMotion}>
                <DestinationExplorerPanel
                  destinations={filteredDestinations}
                  continent={filters.continent}
                  onContinentChange={(continent) =>
                    setFilters({ ...filters, continent })
                  }
                  onSelectDestination={(dest) => {
                    const full = destinations.find((d) => d.slug === dest.slug);
                    if (full) openDestination(full);
                  }}
                  coverBySlug={destCoverBySlug}
                  resultsId="risultati-itinerari"
                />
              </motion.div>
            ) : null}

            {step === 'plan' && template ? (
              <motion.div key="plan" {...phaseMotion}>
              <div className="mx-auto w-full max-w-5xl space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:space-y-5 sm:p-6 md:p-8">
                <div className="relative flex flex-wrap items-center justify-center gap-2 pr-14">
                  {templatesForDestination(template.destination_slug).map((t) => (
                    <button
                      key={t.template_id}
                      type="button"
                      onClick={() => setDuration(t.duration_days)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                        t.duration_days === template.duration_days
                          ? 'bg-primary text-white'
                          : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-primary hover:text-primary'
                      )}
                    >
                      {t.duration_days} giorni
                    </button>
                  ))}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <PlanSaveButton
                      key={template.template_id}
                      templateId={template.template_id}
                      initialSaved={favoriteTemplateIds.includes(template.template_id)}
                      isLoggedIn={Boolean(session?.user)}
                    />
                  </div>
                </div>
                <p className="text-center text-slate-700">{template.summary}</p>
                <div className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <Wallet className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">
                      {COMPLIANCE_COPY.budgetLabel}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € a persona
                    </p>
                  </div>
                </div>
                <div>
                  <h2 className="mb-3 text-center font-display text-lg font-semibold text-slate-900">
                    Giorno per giorno
                  </h2>
                  <ItineraryDaysWithMap key={template.template_id} template={template} />
                </div>
                <p className="text-center text-xs text-slate-500">
                  {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
                </p>
              </div>
              </motion.div>
            ) : null}

            {step === 'when' && template ? (
              <motion.div key="when" {...phaseMotion} className="space-y-5">
                <div
                  className="mx-auto flex w-full max-w-md gap-1 rounded-full border border-slate-200 bg-white p-1"
                  role="radiogroup"
                  aria-label="Con chi parti"
                >
                  {(
                    [
                      ['solo', 'Da solo', User],
                      ['friends', 'Con amici', Users],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={mode === id}
                      onClick={() => setMode(id)}
                      className={cn(
                        'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition',
                        mode === id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
                <TripWhenPicker
                  destinationSlug={template.destination_slug}
                  baseTemplate={template}
                  value={whenSelection}
                  onChange={setWhenSelection}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {step !== 'dest' ? (
          <div className="mt-6 shrink-0 border-t border-border bg-white pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-slate-500 hover:bg-muted hover:text-slate-800"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
                Torna indietro
              </Button>
              {step === 'when' ? (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full px-6 font-semibold sm:px-8"
                  disabled={pending}
                  onClick={confirm}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Apri il viaggio
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full px-8 font-semibold"
                  onClick={() => setStep('when')}
                >
                  Scegli le date
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
