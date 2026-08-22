'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { addDays, format, nextFriday, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { it as itDayPicker } from 'react-day-picker/locale';
import { ArrowLeft, ArrowRight, CalendarDays, Loader2, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction, startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

import { coverForDestination, uniqueCover, uniqueCoversForSlugs } from '@/lib/composer/destination-covers';
import { CATALOG_CONTINENTS } from '@/lib/catalog/destinations';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import {
  CatalogFiltersBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { OfficialEditionsGrid } from '@/components/itineraries/OfficialEditionsGrid';
import { PhotoChoiceCard } from '@/components/itineraries/PhotoChoiceCard';
import { PlanSaveButton } from '@/components/itineraries/PlanSaveButton';
import { ItineraryDaysWithMap } from '@/components/itineraries/ItineraryWorldMap';
import { findItineraryBySlug, templatesForDestination } from '@/lib/itineraries/catalog';
import { datesForDuration, formatItDate } from '@/lib/itineraries/dates';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';
import type { OfficialEditionCard, TravelMode } from '@/lib/itineraries/types';

const WHO_COVERS = {
  solo: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=80',
  friends:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
  group: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=900&q=80',
} as const;

type Step = 'dest' | 'plan' | 'who' | 'when';

const STEPS: Step[] = ['dest', 'plan', 'who', 'when'];

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
  initialHomeView = 'itinerari',
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
  /** Toggle home: catalogo nazioni vs partenze già aperte. */
  initialHomeView?: 'itinerari' | 'partenze';
  favoriteTemplateIds?: string[];
}) {
  const startTemplate = initialSlug
    ? findItineraryBySlug(initialSlug, initialDuration)
    : undefined;
  const [step, setStep] = useState<Step>(startTemplate ? 'plan' : 'dest');
  const [homeView, setHomeView] = useState<'itinerari' | 'partenze'>(
    startTemplate ? 'itinerari' : initialHomeView
  );
  const [slug, setSlug] = useState(startTemplate?.destination_slug ?? '');
  const [duration, setDuration] = useState(startTemplate?.duration_days ?? 0);
  const [mode, setMode] = useState<TravelMode | null>(null);
  const [date, setDate] = useState<Date>();
  const [editionId, setEditionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);
  const [pending, startTransition] = useTransition();
  const { data: session } = useSession();
  const router = useRouter();

  const showPartenze = step === 'dest' && homeView === 'partenze';

  const template = slug && duration ? findItineraryBySlug(slug, duration) : undefined;
  const idx = STEPS.indexOf(step);
  const range = date && template ? datesForDuration(format(date, 'yyyy-MM-dd'), template.duration_days) : null;
  const officialForTemplate = useMemo(
    () => editions.filter((e) => e.template_id === template?.template_id),
    [editions, template?.template_id]
  );

  const filteredDestinations = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return destinations.filter((d) => {
      if (filters.continent !== 'Tutte' && d.continent !== filters.continent) return false;
      if (filters.duration != null && !d.allowedDurations.includes(filters.duration)) return false;
      if (filters.published === true && d.published !== true) return false;
      if (filters.published === false && d.published !== false) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.vibe.toLowerCase().includes(q) ||
        (d.continent ?? '').toLowerCase().includes(q)
      );
    });
  }, [destinations, filters]);

  const destSections = useMemo(() => {
    const order = [...CATALOG_CONTINENTS];
    return order
      .map((c) => ({
        continent: c,
        items: filteredDestinations.filter((d) => d.continent === c),
      }))
      .filter((s) => s.items.length > 0);
  }, [filteredDestinations]);

  const destCoverBySlug = useMemo(() => {
    const slugs = destSections.flatMap((s) => s.items.map((d) => d.slug));
    const urls = uniqueCoversForSlugs(slugs);
    return Object.fromEntries(slugs.map((s, i) => [s, urls[i]]));
  }, [destSections]);

  const durationOptions = useMemo(
    () =>
      [...new Set(destinations.flatMap((d) => d.allowedDurations))].sort((a, b) => a - b),
    [destinations]
  );

  const fridayHints = useMemo(() => {
    const first = nextFriday(startOfDay(new Date()));
    return [0, 1, 2, 3].map((w) => addDays(first, w * 7));
  }, []);

  const pickDuration = (dest: (typeof destinations)[number], days: number) => {
    if (dest.published === false) {
      toast.error('Presto. Ora parti da Thailandia.');
      return;
    }
    setSlug(dest.slug);
    setDuration(days);
    setStep('plan');
  };

  const goBack = () => {
    const prev = STEPS[idx - 1];
    if (prev) setStep(prev);
  };

  const goNext = () => {
    if (step === 'plan') {
      setStep('who');
      return;
    }
    if (step === 'who') {
      if (!mode) {
        toast.error('Scegli come vuoi partire.');
        return;
      }
      if (mode === 'group') {
        const eds = editions.filter((e) => e.template_id === template?.template_id);
        if (eds.length === 1) {
          confirmWithEdition(eds[0].id);
          return;
        }
      }
      setStep('when');
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
      toast.error('Accedi per confermare.');
      router.push(`/?callbackUrl=/itinerario/${template.destination_slug}?d=${template.duration_days}`);
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
    if (!date) {
      toast.error('Scegli il giorno di partenza.');
      return;
    }
    startTransition(async () => {
      const result = await startPracticeAction({
        templateId: template.template_id,
        mode: mode === 'friends' ? 'friends' : 'solo',
        dateFrom: format(date, 'yyyy-MM-dd'),
      });
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <div className="composer-shell relative min-h-[calc(100vh-4rem)] overflow-hidden bg-white">
      {step === 'dest' ? (
        <section className="relative isolate overflow-hidden">
          <HeroBackground
            images={BRAND_IMAGES.heroes.slideshow}
            overlay="dark"
            className="z-0"
            intervalMs={6500}
          />
          <div className="relative z-10 nl-page flex w-full flex-col items-center gap-4 pb-4 pt-10 text-center sm:pt-12">
            <div className="inline-flex rounded-full border border-white/25 bg-black/35 p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setHomeView('itinerari');
                  router.replace('/destinazioni', { scroll: false });
                }}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                  homeView === 'itinerari'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-white/85 hover:text-white'
                )}
              >
                Itinerari
              </button>
              <button
                type="button"
                onClick={() => {
                  setHomeView('partenze');
                  router.replace('/destinazioni?vista=partenze', { scroll: false });
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition',
                  homeView === 'partenze'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-white/85 hover:text-white'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Partenze
              </button>
            </div>
            {!showPartenze ? (
              <div className="flex items-center justify-center gap-2">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500',
                      i === idx ? 'w-10 bg-accent' : i < idx ? 'w-5 bg-accent/50' : 'w-5 bg-white/35'
                    )}
                  />
                ))}
              </div>
            ) : null}
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white drop-shadow md:text-5xl">
              {showPartenze ? 'Partenze già aperte' : 'Scegli la nazione. Poi i giorni.'}
            </h1>
            <p className="mx-auto max-w-xl text-base text-white/90 drop-shadow">
              {showPartenze
                ? 'Istanze già avviate. Entri e vedi i voli. Ognuno prenota da solo.'
                : 'Cerca o scegli il continente. Poi i giorni.'}
            </p>
          </div>
          <div className="relative z-10 nl-page w-full pb-8 pt-2">
            <CatalogFiltersBar
              value={filters}
              onChange={setFilters}
              searchPlaceholder={
                showPartenze
                  ? 'Cerca destinazione o date'
                  : 'Cerca nazione, continente o vibe'
              }
              resultsId={showPartenze ? 'risultati-partenze' : 'risultati-itinerari'}
              durationOptions={durationOptions}
              publishedLabels={
                showPartenze
                  ? { all: 'Tutte', yes: 'Disponibile', no: 'Ultimi posti' }
                  : { all: 'Tutte', yes: 'Prenotabili', no: 'In arrivo' }
              }
            />
          </div>
        </section>
      ) : null}

      <div
        className={cn(
          'relative z-10 nl-page flex w-full flex-col pb-24',
          step === 'dest' ? 'min-h-0 pt-6' : 'min-h-[calc(100vh-4rem)] pt-6'
        )}
      >
        {step !== 'dest' ? (
          <div className="mb-8 space-y-4 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Step {idx + 1} di {STEPS.length}
            </p>
            <div className="flex items-center justify-center gap-2">
              {STEPS.map((s, i) => (
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
              {step === 'who' && 'Come vuoi partire?'}
              {step === 'when' && (mode === 'group' ? 'Scegli la partenza' : 'Quando parti?')}
            </h1>
            <p className="mx-auto max-w-xl text-base text-slate-600">
              {step === 'plan' && 'Riferimento, non pacchetto. Avanti per date e compagni.'}
              {step === 'who' && 'Stesso piano. Cambiano solo date e con chi vai.'}
              {step === 'when' &&
                (mode === 'group'
                  ? 'Date già fissate. Entri e vedi i voli.'
                  : 'Scegli il giorno. Poi partono voli, hotel e attrazioni.')}
            </p>
          </div>
        ) : null}

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 'dest' && showPartenze ? (
              <motion.div key="partenze" {...phaseMotion}>
                <OfficialEditionsGrid
                  editions={editions}
                  filters={filters}
                  onFiltersChange={setFilters}
                  showFiltersBar={false}
                />
              </motion.div>
            ) : null}

            {step === 'dest' && !showPartenze ? (
              <motion.div key="dest" {...phaseMotion} className="space-y-5">
                <p className="text-center text-sm font-medium text-slate-600">
                  {filteredDestinations.length}{' '}
                  {filteredDestinations.length === 1 ? 'meta' : 'mete'}
                  {filters.duration != null ? ` · ${filters.duration} giorni` : ''}
                  {filters.continent !== 'Tutte' ? ` · ${filters.continent}` : ''}
                </p>
                {destSections.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600 shadow-sm">
                    Nessuna destinazione con questo filtro.
                  </p>
                ) : (
                  <div id="risultati-itinerari" className="space-y-6">
                    {destSections.map((section) => (
                      <section key={section.continent} className="space-y-3">
                        <h2 className="font-display text-lg font-semibold uppercase tracking-[0.14em] text-slate-900">
                          {section.continent}
                          <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-slate-400">
                            {section.items.length}
                          </span>
                        </h2>
                        <div className="nl-card-grid">
                          {section.items.map((dest) => (
                            <article
                              key={dest.slug}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary/30 hover:shadow-md"
                            >
                              <div className="relative h-44">
                                <Image
                                  src={destCoverBySlug[dest.slug] ?? coverForDestination(dest.slug)}
                                  alt={dest.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 100vw, 50vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                                <p className="absolute left-4 top-4 rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                                  {dest.continent ?? section.continent}
                                </p>
                                {dest.published === false ? (
                                  <p className="absolute right-4 top-4 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                    Presto
                                  </p>
                                ) : dest.published ? (
                                  <p className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                                    Aperta
                                  </p>
                                ) : null}
                                <div className="absolute bottom-3 left-4 right-4">
                                  <h3 className="font-display text-2xl font-semibold text-white drop-shadow">
                                    {dest.emoji} {dest.name}
                                  </h3>
                                  <p className="mt-0.5 text-sm text-white/95 drop-shadow">{dest.vibe}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-3">
                                {dest.allowedDurations.map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => pickDuration(dest, n)}
                                    className={cn(
                                      'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                                      filters.duration === n
                                        ? 'bg-primary text-white'
                                        : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-primary hover:text-primary'
                                    )}
                                  >
                                    {n} giorni
                                  </button>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : null}

            {step === 'plan' && template ? (
              <motion.div key="plan" {...phaseMotion}>
              <div className="mx-auto w-full max-w-5xl space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
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
                  <ItineraryDaysWithMap template={template} />
                </div>
                <p className="text-center text-xs text-slate-500">
                  {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
                </p>
              </div>
              </motion.div>
            ) : null}

            {step === 'who' ? (
              <motion.div key="who" {...phaseMotion} className="grid gap-3 sm:grid-cols-3">
                <PhotoChoiceCard
                  cover={WHO_COVERS.solo}
                  active={mode === 'solo'}
                  onClick={() => setMode('solo')}
                  kicker="Viaggio Privato"
                  title="Da solo"
                  body="Date tue. Poi i voli."
                />
                <PhotoChoiceCard
                  cover={WHO_COVERS.friends}
                  active={mode === 'friends'}
                  onClick={() => setMode('friends')}
                  kicker="Viaggio Privato"
                  title="Con amici"
                  body="Stesse date. Invito."
                />
                <PhotoChoiceCard
                  cover={WHO_COVERS.group}
                  active={mode === 'group'}
                  onClick={() => setMode('group')}
                  kicker="Viaggio Condiviso"
                  title="In gruppo"
                  body="Date già aperte. Subito i voli."
                />
              </motion.div>
            ) : null}

            {step === 'when' ? (
              <motion.div key="when" {...phaseMotion}>
                {mode === 'group' ? (
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
                ) : (
                  <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                    <div className="flex flex-wrap gap-2">
                      {fridayHints.map((d) => {
                        const active = date && format(date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
                        return (
                          <button
                            key={d.toISOString()}
                            type="button"
                            onClick={() => setDate(d)}
                            className={cn(
                              'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                              active
                                ? 'bg-primary text-white'
                                : 'border border-slate-200 bg-slate-50 text-slate-800 hover:border-primary hover:text-primary'
                            )}
                          >
                            Ven {format(d, 'd MMM', { locale: it })}
                          </button>
                        );
                      })}
                    </div>
                    <Calendar
                      mode="single"
                      locale={itDayPicker}
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < startOfDay(new Date())}
                      modifiers={
                        range ? { tripEnd: [new Date(`${range.date_to}T12:00:00`)] } : undefined
                      }
                      modifiersClassNames={{
                        tripEnd: 'bg-primary/15 text-primary rounded-md',
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 [--cell-size:2.6rem] sm:[--cell-size:2.9rem]"
                      classNames={{
                        root: 'w-full',
                        month: 'w-full',
                        weekday: 'text-slate-400',
                        today: 'bg-slate-100 text-slate-900 rounded-md',
                        disabled: 'text-slate-300 opacity-40',
                        outside: 'text-slate-300',
                      }}
                    />
                    {date && range ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <CalendarDays className="mt-0.5 h-4 w-4 text-accent" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {format(date, 'EEEE d MMMM yyyy', { locale: it })} →{' '}
                            {format(new Date(`${range.date_to}T12:00:00`), 'EEEE d MMMM yyyy', {
                              locale: it,
                            })}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {template?.duration_days} giorni · partenza e rientro
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-sm text-slate-600">
                        Tocca un venerdì o un giorno sul calendario.
                      </p>
                    )}
                  </div>
                )}
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
              {step === 'when' && mode !== 'group' ? (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full px-8 font-semibold shadow-lg shadow-accent/20"
                  disabled={pending}
                  onClick={confirm}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Conferma e vedi i voli
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : step === 'when' && mode === 'group' ? (
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
