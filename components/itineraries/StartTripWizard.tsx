'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction, startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { TripWhenPicker, type TripWhenSelection } from '@/components/itineraries/TripWhenPicker';

import { uniqueCover, uniqueCoversForSlugs } from '@/lib/composer/destination-covers';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import {
  CatalogHeroSearchBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { DestinationExplorerPanel } from '@/components/itineraries/DestinationExplorerPanel';
import { OfficialEditionsGrid } from '@/components/itineraries/OfficialEditionsGrid';
import { HomeTravelModeSelector } from '@/components/itineraries/HomeTravelModeSelector';
import { TrendingDestinationsCarousel } from '@/components/itineraries/TrendingDestinationsCarousel';
import { PhotoChoiceCard } from '@/components/itineraries/PhotoChoiceCard';
import { PlanSaveButton } from '@/components/itineraries/PlanSaveButton';
import { ItineraryDaysWithMap } from '@/components/itineraries/ItineraryWorldMap';
import { findItineraryBySlug, minBudgetHintForDestination, templatesForDestination } from '@/lib/itineraries/catalog';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { formatItDate } from '@/lib/itineraries/dates';
import { aggregatePublicDestinations } from '@/lib/itineraries/public-destinations';
import {
  homeTravelModeToPath,
  homeTravelModeToTravelMode,
  type HomeTravelMode,
} from '@/lib/itineraries/home-travel-mode';
import { buildTrendingCarouselItems } from '@/lib/itineraries/trending-destinations';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';
import type { OfficialEditionCard, TravelMode } from '@/lib/itineraries/types';

type Step = 'dest' | 'plan' | 'when';
type TripKind = 'privati' | 'pubblici';

const PRIVATE_STEPS: Step[] = ['dest', 'plan', 'when'];
const PUBLIC_STEPS: Step[] = ['dest', 'plan', 'when'];

const phaseMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

export function StartTripWizard({
  destinations,
  editions,
  initialSlug,
  initialDuration,
  initialHomeTravelMode = 'solo',
  initialPublicDest,
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
  /** Modalità scelta in Home: solo, amici o gruppo aperto. */
  initialHomeTravelMode?: HomeTravelMode;
  /** Meta selezionata nel flusso gruppo aperto (?dest=slug). */
  initialPublicDest?: string;
  favoriteTemplateIds?: string[];
}) {
  const startTemplate = initialSlug
    ? findItineraryBySlug(initialSlug, initialDuration)
    : undefined;
  const [step, setStep] = useState<Step>(startTemplate ? 'plan' : 'dest');
  const [homeTravelMode, setHomeTravelMode] = useState<HomeTravelMode>(
    startTemplate ? 'solo' : initialHomeTravelMode
  );
  const [tripKind, setTripKind] = useState<TripKind>(
    startTemplate
      ? 'privati'
      : initialHomeTravelMode === 'group'
        ? 'pubblici'
        : 'privati'
  );
  const [slug, setSlug] = useState(startTemplate?.destination_slug ?? '');
  const [duration, setDuration] = useState(startTemplate?.duration_days ?? 0);
  const [mode, setMode] = useState<TravelMode | null>(
    startTemplate
      ? null
      : homeTravelModeToTravelMode(initialHomeTravelMode)
  );
  const [whenSelection, setWhenSelection] = useState<TripWhenSelection | null>(null);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);
  const [publicDestSlug, setPublicDestSlug] = useState(initialPublicDest ?? '');
  const [pending, startTransition] = useTransition();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const dest = searchParams.get('dest') ?? '';
    setPublicDestSlug(dest);
    const vista = searchParams.get('vista');
    const modalita = searchParams.get('modalita');
    if (step !== 'dest') return;
    const parsed =
      vista === 'partenze' ? 'group' : modalita === 'amici' ? 'friends' : 'solo';
    setHomeTravelMode(parsed);
    if (parsed === 'group') {
      setTripKind('pubblici');
      setMode('group');
    } else {
      setTripKind('privati');
      setMode(homeTravelModeToTravelMode(parsed));
    }
  }, [searchParams, step]);

  const showGruppoAperto = step === 'dest' && homeTravelMode === 'group';
  const showPublicDestinations = showGruppoAperto && !publicDestSlug;
  const showPublicEditions = showGruppoAperto && Boolean(publicDestSlug);

  const trendingCarouselItems = useMemo(
    () => buildTrendingCarouselItems(destinations, editions),
    [destinations, editions]
  );

  const applyHomeTravelMode = (mode: HomeTravelMode) => {
    setHomeTravelMode(mode);
    setPublicDestSlug('');
    router.replace(homeTravelModeToPath(mode), { scroll: false });
    if (mode === 'group') {
      setTripKind('pubblici');
      setMode('group');
    } else {
      setTripKind('privati');
      setMode(homeTravelModeToTravelMode(mode));
    }
  };

  const openPublicHub = () => {
    applyHomeTravelMode('group');
  };

  const openCarouselDestination = (slug: string) => {
    setHomeTravelMode('group');
    setTripKind('pubblici');
    setMode('group');
    selectPublicDestination(slug);
  };

  const publicDestinationName = useMemo(() => {
    if (!publicDestSlug) return null;
    return (
      findCatalogDestination(publicDestSlug)?.name ??
      findItineraryBySlug(publicDestSlug)?.destination_name ??
      publicDestSlug
    );
  }, [publicDestSlug]);

  const selectPublicDestination = (slug: string) => {
    setPublicDestSlug(slug);
    router.replace(
      `/destinazioni?vista=partenze&dest=${encodeURIComponent(slug)}`,
      { scroll: false }
    );
  };

  const clearPublicDestination = () => {
    setPublicDestSlug('');
    router.replace('/destinazioni?vista=partenze', { scroll: false });
  };
  const isPubblici = tripKind === 'pubblici';
  const flowSteps = isPubblici ? PUBLIC_STEPS : PRIVATE_STEPS;

  const template = slug && duration ? findItineraryBySlug(slug, duration) : undefined;
  const idx = flowSteps.indexOf(step);
  const officialForTemplate = useMemo(
    () => editions.filter((e) => e.template_id === template?.template_id),
    [editions, template?.template_id]
  );

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

  const explorerDestinations = useMemo(() => {
    if (showGruppoAperto) {
      const slugsWithEditions = new Set(
        aggregatePublicDestinations(editions).map((d) => d.slug)
      );
      return filteredDestinations.filter((d) => slugsWithEditions.has(d.slug));
    }
    return filteredDestinations;
  }, [filteredDestinations, showGruppoAperto, editions]);

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
    setTripKind('privati');
    setMode(
      homeTravelMode === 'friends'
        ? 'friends'
        : homeTravelMode === 'group'
          ? 'group'
          : 'solo'
    );
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
    const prev = flowSteps[idx - 1];
    if (prev) setStep(prev);
  };

  const goNext = () => {
    if (step === 'plan') {
      if (isPubblici) {
        setMode('group');
        setStep('when');
      } else {
        if (!mode) {
          setMode(homeTravelModeToTravelMode(homeTravelMode));
        }
        setStep('when');
      }
    }
  };

  const confirmWithEdition = (id: string) => {
    if (!template) return;
    if (!session?.user) {
      toast.error('Accedi per confermare.');
      router.push(`/?callbackUrl=/itinerario/${template.destination_slug}?d=${template.duration_days}`);
      return;
    }
    startTransition(async () => {
      const result = await joinEditionAction(id);
      if (result?.error) toast.error(result.error);
    });
  };

  const confirm = () => {
    if (!template) return;
    if (!session?.user) {
      toast.error('Accedi per salvare la bozza.');
      router.push(
        `/?callbackUrl=${encodeURIComponent(
          `/itinerario/${template.destination_slug}?d=${template.duration_days}`
        )}`
      );
      return;
    }
    if (mode === 'group') {
      if (!editionId) {
        toast.error('Scegli una partenza ufficiale.');
        return;
      }
      confirmWithEdition(editionId);
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
              {showGruppoAperto
                ? 'In Partenza'
                : homeTravelMode === 'friends'
                  ? 'In compagnia, stesso piano'
                  : 'La tua vacanza, in tre click'}
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-snug text-white/90 drop-shadow sm:text-[19px] md:text-[22px]">
              {showGruppoAperto
                ? 'Viaggia insieme ad altri, prenota, divertiti.'
                : homeTravelMode === 'friends'
                  ? 'Scegli l’itinerario e condividilo con chi vuoi.'
                  : 'Scegli il tuo itinerario e parti quando vuoi.'}
            </p>
          </div>
          {/* Search sul confine foto / bianco, stessa larghezza di navbar e schede */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-1/2">
            <div className="nl-page pointer-events-auto w-full">
              <CatalogHeroSearchBar
                value={filters}
                onChange={setFilters}
                placeholder={
                  showGruppoAperto
                    ? showPublicEditions
                      ? 'Cerca date o durata'
                      : 'Cerca destinazione'
                    : 'Cerca nazione, continente o vibe'
                }
                resultsId={showGruppoAperto ? 'risultati-partenze' : 'risultati-itinerari'}
                durationOptions={durationOptions}
              />
            </div>
          </div>
        </section>
      ) : null}

      <div
        className={cn(
          'relative z-10 flex w-full flex-col pb-24',
          step === 'dest' ? 'min-h-0 pt-12' : 'min-h-[calc(100vh-4rem)] pt-6',
          step === 'dest' ? 'nl-home-content' : 'nl-page'
        )}
      >
        {step === 'dest' ? (
          <div className="mb-6 flex w-full flex-col items-center gap-6">
            <HomeTravelModeSelector
              value={homeTravelMode}
              onChange={applyHomeTravelMode}
            />
            {showGruppoAperto && !showPublicEditions ? (
              <TrendingDestinationsCarousel
                items={trendingCarouselItems}
                onDestinationClick={openCarouselDestination}
                onPublicHubClick={openPublicHub}
              />
            ) : null}
          </div>
        ) : null}

        {step !== 'dest' ? (
          <div className="mb-8 space-y-4 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Step {idx + 1} di {flowSteps.length}
            </p>
            <div className="flex items-center justify-center gap-2">
              {flowSteps.map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    i === idx ? 'w-10 bg-accent' : i < idx ? 'w-5 bg-accent/50' : 'w-5 bg-slate-200'
                  )}
                />
              ))}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              {step === 'plan' && 'Questo è il piano.'}
              {step === 'when' && (isPubblici ? 'Scegli la partenza' : 'Quando parti?')}
            </h1>
            <p className="mx-auto max-w-xl text-base text-slate-600">
              {step === 'plan' &&
                (isPubblici
                  ? 'Riferimento condiviso. Avanti per unirti agli altri viaggiatori.'
                  : 'Riferimento, non pacchetto. Avanti per le date.')}
              {step === 'when' &&
                (isPubblici
                  ? 'Date già fissate. Entri e vedi i voli.'
                  : 'Quanti giorni hai? Scegli le date — il piano si adatta.')}
            </p>
          </div>
        ) : null}

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {showPublicDestinations ? (
              <motion.div key="pubblici-dest" {...phaseMotion}>
                <DestinationExplorerPanel
                  destinations={explorerDestinations}
                  continent={filters.continent}
                  onContinentChange={(continent) =>
                    setFilters({ ...filters, continent })
                  }
                  onSelectDestination={(dest) => selectPublicDestination(dest.slug)}
                  coverBySlug={destCoverBySlug}
                  ctaLabel="Esplora partenze"
                  resultsId="risultati-partenze"
                />
              </motion.div>
            ) : null}

            {showPublicEditions ? (
              <motion.div key={`pubblici-editions-${publicDestSlug}`} {...phaseMotion}>
                <OfficialEditionsGrid
                  editions={editions}
                  filters={filters}
                  onFiltersChange={setFilters}
                  showFiltersBar={false}
                  destinationSlug={publicDestSlug}
                  destinationName={publicDestinationName ?? undefined}
                  onBack={clearPublicDestination}
                />
              </motion.div>
            ) : null}

            {step === 'dest' && !showGruppoAperto ? (
              <motion.div key="dest" {...phaseMotion}>
                <DestinationExplorerPanel
                  destinations={explorerDestinations}
                  continent={filters.continent}
                  onContinentChange={(continent) =>
                    setFilters({ ...filters, continent })
                  }
                  onSelectDestination={(dest) => {
                    const full = destinations.find((d) => d.slug === dest.slug);
                    if (full) openDestination(full);
                  }}
                  coverBySlug={destCoverBySlug}
                  ctaLabel="Vedi piano"
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

            {step === 'when' ? (
              <motion.div key="when" {...phaseMotion}>
                {isPubblici ? (
                  officialForTemplate.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
                      Nessuna partenza ufficiale su questa durata.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {officialForTemplate.map((ed, i) => (
                        <PhotoChoiceCard
                          key={ed.id}
                          cover={uniqueCover(slug || 'thailandia', i)}
                          active={editionId === ed.id}
                          onClick={() => {
                            setEditionId(ed.id);
                            confirmWithEdition(ed.id);
                          }}
                          kicker={`${ed.confirmed_count}/${ed.min_confirmed} partecipanti`}
                          title={template?.destination_name ?? 'Partenza'}
                          body={`${formatItDate(ed.date_from)} – ${formatItDate(ed.date_to)}`}
                        />
                      ))}
                    </div>
                  )
                ) : template ? (
                  <TripWhenPicker
                    destinationSlug={template.destination_slug}
                    baseTemplate={template}
                    value={whenSelection}
                    onChange={setWhenSelection}
                  />
                ) : null}
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
                className="rounded-full text-foreground hover:bg-muted"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </Button>
              {step === 'when' && !isPubblici ? (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full px-6 font-semibold shadow-lg shadow-accent/20 sm:px-8"
                  disabled={pending}
                  onClick={confirm}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salva bozza e vedi i voli
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : step === 'when' && isPubblici ? (
                <span />
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full px-8 font-semibold shadow-lg shadow-accent/20"
                  onClick={goNext}
                >
                  Avanti
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
