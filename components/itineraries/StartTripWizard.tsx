'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { addDays, format, nextFriday, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { it as itDayPicker } from 'react-day-picker/locale';
import { ArrowLeft, ArrowRight, CalendarDays, Loader2, MapPin, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction, startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

import { coverForDestination, uniqueCover, uniqueCoversForSlugs } from '@/lib/composer/destination-covers';
import { CATALOG_CONTINENTS } from '@/lib/catalog/destinations';
import {
  CatalogFiltersBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { OfficialEditionsGrid } from '@/components/itineraries/OfficialEditionsGrid';
import { PhotoChoiceCard } from '@/components/itineraries/PhotoChoiceCard';
import { PlanSaveButton } from '@/components/itineraries/PlanSaveButton';
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
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col px-4 pb-24 pt-10">
        <div className="mb-8 space-y-4 text-center">
          {step === 'dest' ? (
            <div className="inline-flex rounded-full border border-white/15 bg-[#0b1220]/80 p-1">
              <button
                type="button"
                onClick={() => {
                  setHomeView('itinerari');
                  router.replace('/destinazioni', { scroll: false });
                }}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition',
                  homeView === 'itinerari'
                    ? 'bg-accent text-[#0b1220]'
                    : 'text-white/75 hover:text-white'
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
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition',
                  homeView === 'partenze'
                    ? 'bg-accent text-[#0b1220]'
                    : 'text-white/75 hover:text-white'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Partenze
              </button>
            </div>
          ) : (
            <p className="inline-flex items-center gap-2 rounded-full bg-[#161d2b] px-4 py-1.5 text-sm text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Step {idx + 1} di {STEPS.length}
            </p>
          )}
          {step !== 'dest' || !showPartenze ? (
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
          ) : null}
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            {showPartenze && 'Partenze già aperte'}
            {!showPartenze && step === 'dest' && 'Scegli la nazione. Poi i giorni.'}
            {step === 'plan' && 'Questo è il piano.'}
            {step === 'who' && 'Come vuoi partire?'}
            {step === 'when' && (mode === 'group' ? 'Scegli la partenza' : 'Quando parti?')}
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            {showPartenze && 'Istanze già avviate. Entri e vedi i voli. Ognuno prenota da solo.'}
            {!showPartenze && step === 'dest' && 'Cerca o scegli il continente. Poi i giorni.'}
            {step === 'plan' && 'Riferimento, non pacchetto. Avanti per date e compagni.'}
            {step === 'who' && 'Stesso piano. Cambiano solo date e con chi vai.'}
            {step === 'when' &&
              (mode === 'group'
                ? 'Date già fissate. Entri e vedi i voli.'
                : 'Scegli il giorno. Poi partono voli, hotel e attrazioni.')}
          </p>
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 'dest' && showPartenze ? (
              <motion.div key="partenze" {...phaseMotion}>
                <OfficialEditionsGrid editions={editions} />
              </motion.div>
            ) : null}

            {step === 'dest' && !showPartenze ? (
              <motion.div key="dest" {...phaseMotion} className="space-y-5">
                <CatalogFiltersBar
                  value={filters}
                  onChange={setFilters}
                  searchPlaceholder="Cerca nazione, continente o vibe"
                  resultsId="risultati-itinerari"
                />
                <p className="text-center text-xs text-muted-foreground">
                  {filteredDestinations.length}{' '}
                  {filteredDestinations.length === 1 ? 'meta' : 'mete'} · filtri e ricerca
                  aggiornano l’elenco
                </p>
                {destSections.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-[#0b1220]/60 px-4 py-8 text-center text-sm text-white/70">
                    Nessuna destinazione con questo filtro.
                  </p>
                ) : (
                  <div id="risultati-itinerari" className="space-y-6">
                    {destSections.map((section) => (
                      <section key={section.continent} className="space-y-3">
                        <h2 className="font-display text-lg font-semibold uppercase tracking-[0.14em] text-foreground">
                          {section.continent}
                          <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-white/40">
                            {section.items.length}
                          </span>
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {section.items.map((dest) => (
                            <article
                              key={dest.slug}
                              className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220]/75 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)]"
                            >
                              <div className="relative h-44">
                                <Image
                                  src={destCoverBySlug[dest.slug] ?? coverForDestination(dest.slug)}
                                  alt={dest.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 100vw, 50vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                                  {dest.continent ?? section.continent}
                                </p>
                                {dest.published === false ? (
                                  <p className="absolute right-4 top-4 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
                                    Presto
                                  </p>
                                ) : dest.published ? (
                                  <p className="absolute right-4 top-4 rounded-full bg-accent/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b1220]">
                                    Aperta
                                  </p>
                                ) : null}
                                <div className="absolute bottom-3 left-4 right-4">
                                  <h3 className="font-display text-2xl font-semibold text-white">
                                    {dest.emoji} {dest.name}
                                  </h3>
                                  <p className="mt-0.5 text-sm text-white/85">{dest.vibe}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                                {dest.allowedDurations.map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => pickDuration(dest, n)}
                                    className={cn(
                                      'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                                      filters.duration === n
                                        ? 'bg-accent text-[#0b1220]'
                                        : 'border border-white/20 bg-white/8 text-white hover:bg-accent hover:text-[#0b1220]'
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
              <motion.div key="plan" {...phaseMotion} className="flex items-start gap-3 sm:gap-4">
              <div className="composer-panel min-w-0 flex-1 space-y-5 rounded-3xl p-6 md:p-8">
                <div className="flex flex-wrap gap-2">
                  {templatesForDestination(template.destination_slug).map((t) => (
                    <button
                      key={t.template_id}
                      type="button"
                      onClick={() => setDuration(t.duration_days)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                        t.duration_days === template.duration_days
                          ? 'bg-accent text-[#0b1220]'
                          : 'border border-[#2a3344] bg-[#0b1220] text-white/80 hover:bg-[#1c2436]'
                      )}
                    >
                      {t.duration_days} giorni
                    </button>
                  ))}
                </div>
                <p className="text-white/85">{template.summary}</p>
                <div className="flex items-center gap-3 rounded-2xl bg-[#0b1220] px-4 py-3">
                  <Wallet className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/45">
                      {COMPLIANCE_COPY.budgetLabel}
                    </p>
                    <p className="text-sm font-medium text-white">
                      ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € a persona
                    </p>
                  </div>
                </div>
                <ol className="space-y-2">
                  {template.days.map((day) => (
                    <li key={day.day_number} className="rounded-2xl bg-[#0b1220] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                        Giorno {day.day_number}
                      </p>
                      <p className="font-semibold text-white">{day.title}</p>
                      <p className="mt-1 text-sm text-white/70">{day.description}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                        <MapPin className="h-3 w-3" />
                        {day.area_segment}
                      </p>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-white/50">
                  {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
                </p>
              </div>
              <PlanSaveButton
                key={template.template_id}
                templateId={template.template_id}
                initialSaved={favoriteTemplateIds.includes(template.template_id)}
                isLoggedIn={Boolean(session?.user)}
              />
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
                    <p className="text-sm text-white/80">Nessuna partenza ufficiale su questa durata.</p>
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
                  <div className="composer-panel space-y-5 rounded-3xl p-5 md:p-7">
                    <div className="flex flex-wrap gap-2">
                      {fridayHints.map((d) => {
                        const active = date && format(date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
                        return (
                          <button
                            key={d.toISOString()}
                            type="button"
                            onClick={() => setDate(d)}
                            className={cn(
                              'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                              active
                                ? 'bg-accent text-[#0b1220]'
                                : 'border border-white/15 bg-[#0b1220] text-white/80 hover:bg-[#1c2436]'
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
                        tripEnd: 'bg-accent/25 text-white rounded-md',
                      }}
                      className="w-full rounded-2xl border border-[#2a3344] bg-[#0b1220] p-3 text-white [--cell-size:2.6rem] sm:[--cell-size:2.9rem]"
                      classNames={{
                        root: 'w-full',
                        month: 'w-full',
                        weekday: 'text-white/40',
                        today: 'bg-white/10 text-white rounded-md',
                        disabled: 'text-white/20 opacity-40',
                        outside: 'text-white/25',
                      }}
                    />
                    {date && range ? (
                      <div className="flex items-start gap-3 rounded-2xl bg-[#0b1220] px-4 py-3">
                        <CalendarDays className="mt-0.5 h-4 w-4 text-accent" />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {format(date, 'EEEE d MMMM yyyy', { locale: it })} →{' '}
                            {format(new Date(`${range.date_to}T12:00:00`), 'EEEE d MMMM yyyy', {
                              locale: it,
                            })}
                          </p>
                          <p className="mt-0.5 text-xs text-white/55">
                            {template?.duration_days} giorni · partenza e rientro
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-sm text-white/60">
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
