'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarIcon,
} from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { PlannerQuickSetupSheet } from '@/components/composer/PlannerQuickSetupSheet';
import { ComposerWizardHeader } from '@/components/composer/ComposerWizardHeader';
import { syncDestinationFields, getDraftDestinations } from '@/lib/composer/draft-destinations';
import { buildOrganizerOrigin } from '@/lib/composer/origins';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { tripDestinationCountryLabel } from '@/lib/composer/destination-context';
import { generateTripTitle } from '@/lib/composer/title-generator';
import { remapComposerDaysToDuration } from '@/lib/composer/days';
import { coverForDestination } from '@/lib/composer/destination-covers';
import type { ComposerDraft, DestinationMeta } from '@/types/composer';
import type { PlannerProfile } from '@/types/planner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type ConfigPhase = 'dest' | 'when' | 'from' | 'who';

const WHO_COVERS = {
  solo: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=80',
  group:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
} as const;

const DURATION_CARDS = [
  {
    n: 5 as const,
    kicker: 'Ponte',
    title: '5 giorni',
    body: 'Il lungo weekend che vale un viaggio.',
  },
  {
    n: 7 as const,
    kicker: 'Settimana',
    title: '7 giorni',
    body: 'Il ritmo giusto. Niente fretta.',
  },
  {
    n: 10 as const,
    kicker: 'Il giro',
    title: '10 giorni',
    body: 'Ci stai tutto. Zero rimpianti.',
  },
];

function PaperChoiceCard({
  active,
  onClick,
  kicker,
  title,
  body,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  kicker?: string;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-3xl bg-white px-5 py-5 text-left shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] transition hover:shadow-[0_22px_48px_-20px_rgba(0,0,0,0.6)]',
        active
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-[#0b1220]'
          : 'ring-1 ring-black/5',
        className
      )}
    >
      {kicker ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {kicker}
        </p>
      ) : null}
      <p className="mt-2 font-display text-2xl font-semibold text-slate-900">{title}</p>
      {body ? <p className="mt-1 text-sm leading-snug text-slate-600">{body}</p> : null}
    </button>
  );
}

function PhotoChoiceCard({
  cover,
  active,
  onClick,
  kicker,
  title,
  body,
  className,
  as = 'button',
}: {
  cover: string;
  active?: boolean;
  onClick?: () => void;
  kicker?: string;
  title: string;
  body?: string;
  className?: string;
  as?: 'button' | 'div';
}) {
  const Comp = as;
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'group relative min-h-[196px] overflow-hidden rounded-3xl text-left shadow-[0_24px_50px_-28px_rgba(0,0,0,0.7)] transition duration-300',
        as === 'button' ? 'cursor-pointer' : '',
        active
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-[#0b1220] scale-[1.01]'
          : 'ring-1 ring-white/12 hover:ring-white/30',
        className
      )}
    >
      <Image
        src={cover}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 33vw"
        className="object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="relative z-10 flex h-full min-h-[196px] flex-col justify-end p-5">
        {kicker ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
            {kicker}
          </p>
        ) : null}
        <p className="font-display text-2xl font-semibold text-white">{title}</p>
        {body ? <p className="mt-1 text-sm leading-snug text-white/82">{body}</p> : null}
      </div>
    </Comp>
  );
}

type ComposerLandingStepProps = {
  draft: ComposerDraft;
  onChange: (patch: Partial<ComposerDraft>) => void;
  onStart: () => void;
  onBack?: () => void;
  profileCity?: string | null;
  profileCountry?: string | null;
};

export function ComposerLandingStep({
  draft,
  onChange,
  onStart,
  onBack,
  profileCity: _profileCity,
  profileCountry: _profileCountry,
}: ComposerLandingStepProps) {
  const [plannerOpen, setPlannerOpen] = useState(false);
  const titleTouched = useRef(false);
  const startedWithDest = useRef(Boolean(draft.destination?.trim()));
  const [phase, setPhase] = useState<ConfigPhase>(() =>
    draft.destination?.trim() ? 'when' : 'dest'
  );

  const defaultStart = draft.startDate ? new Date(draft.startDate) : addDays(new Date(), 14);
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    if (draft.endDate) return new Date(draft.endDate);
    return addDays(defaultStart, 7);
  });

  const selectedDestinations = getDraftDestinations(draft);
  const destCover = draft.destination ? coverForDestination(draft.destination) : null;

  const handleDestinationsChange = (destinations: DestinationMeta[]) => {
    const labels = destinations.map((d) => d.label);
    const synced = syncDestinationFields(
      destinations,
      titleTouched.current ? draft.title : ''
    );
    if (destinations.length > 0 && !titleTouched.current) {
      synced.title = generateTripTitle(labels, labels.join('-'));
    }
    onChange({
      ...synced,
      imageUrl: destinations[0] ? coverForDestination(destinations[0].label) : undefined,
    });
  };

  const canNext =
    phase === 'dest'
      ? selectedDestinations.length > 0
      : phase === 'when'
        ? Boolean(startDate && endDate && endDate >= startDate)
        : phase === 'from'
          ? Boolean(draft.organizerOrigin?.iata)
          : Boolean(draft.title.trim());

  const goNext = () => {
    if (phase === 'when' && startDate && endDate) {
      onChange({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
    }
    if (phase === 'dest') setPhase('when');
    else if (phase === 'when') setPhase('from');
    else if (phase === 'from') setPhase('who');
    else onStart();
  };

  const goBack = () => {
    if (phase === 'dest') {
      onBack?.();
      return;
    }
    if (phase === 'when') {
      if (startedWithDest.current) onBack?.();
      else setPhase('dest');
      return;
    }
    if (phase === 'from') setPhase('when');
    else setPhase('from');
  };

  const header =
    phase === 'dest'
      ? {
          label: 'Mete',
          title: 'Dove andiamo?',
          subtitle: 'Una o più mete. Poi date, partenza, compagni.',
          micro: 1,
          total: 4,
        }
      : phase === 'when'
        ? {
            label: 'Quando',
            title: 'Quando parti?',
              subtitle: 'Date e durata. Tre ritmi. L’itinerario si piega a te.',
            micro: startedWithDest.current ? 1 : 2,
            total: startedWithDest.current ? 3 : 4,
          }
        : phase === 'from'
          ? {
              label: 'Da dove',
              title: 'Da dove voli?',
              subtitle: 'Sempre dall’Italia. Verso il paese della meta. Date del viaggio.',
              micro: startedWithDest.current ? 2 : 3,
              total: startedWithDest.current ? 3 : 4,
            }
          : {
              label: 'Con chi',
              title: 'Con chi parti?',
              subtitle: 'Aperto al mondo, o solo con chi inviti tu.',
              micro: startedWithDest.current ? 3 : 4,
              total: startedWithDest.current ? 3 : 4,
            };

  useEffect(() => {
    if (phase !== 'from') return;
    const next = buildOrganizerOrigin('Italia', 'IT');
    if (draft.organizerOrigin?.iata === next.iata && draft.organizerOrigin?.city === next.city) {
      return;
    }
    onChange({ organizerOrigin: next });
  }, [draft.organizerOrigin?.city, draft.organizerOrigin?.iata, onChange, phase]);

  const destCountry = tripDestinationCountryLabel(
    draft.destination,
    draft.destinationMeta
  );

  const applyDuration = (n: 5 | 7 | 10) => {
    const start = startDate ?? addDays(new Date(), 14);
    const end = addDays(start, n - 1);
    const startIso = format(start, 'yyyy-MM-dd');
    setStartDate(start);
    setEndDate(end);
    onChange({
      startDate: startIso,
      endDate: format(end, 'yyyy-MM-dd'),
      days: remapComposerDaysToDuration(draft.days, n, startIso),
    });
  };

  const activeDuration =
    startDate && endDate ? differenceInCalendarDays(endDate, startDate) + 1 : null;

  const phaseMotion = {
    initial: { opacity: 0, x: 18 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -18 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-4xl pb-24"
    >
      <ComposerWizardHeader
        step="landing"
        microStep={header.micro}
        microTotal={header.total}
        microLabel={header.label}
        title={header.title}
        subtitle={header.subtitle}
      />

      {selectedDestinations.length > 0 && phase !== 'dest' ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="composer-destination-pill mb-6 flex items-center gap-3 overflow-hidden px-2 py-2"
        >
          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-2xl">
            {destCover ? (
              <Image src={destCover} alt="" fill sizes="48px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
              Mete
            </p>
            <p className="truncate font-semibold text-white">{draft.destination}</p>
          </div>
        </motion.div>
      ) : null}

      <AnimatePresence mode="wait">
        {phase === 'dest' ? (
          <motion.div key="dest" {...phaseMotion} className="composer-panel rounded-3xl p-8 md:p-10">
            <DestinationSearch
              selectedDestinations={selectedDestinations}
              plannerProfile={draft.plannerProfile}
              onDestinationsChange={handleDestinationsChange}
              onPersonalize={() => setPlannerOpen(true)}
            />
          </motion.div>
        ) : null}

        {phase === 'when' ? (
          <motion.div key="when" {...phaseMotion} className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full rounded-3xl bg-white px-5 py-5 text-left shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] transition hover:shadow-[0_22px_48px_-20px_rgba(0,0,0,0.6)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Partenza
                    </p>
                    <p className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold text-slate-900">
                      <CalendarIcon className="h-5 w-5 text-accent" />
                      {startDate ? format(startDate, 'd MMM yyyy', { locale: it }) : 'Scegli'}
                    </p>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      setStartDate(d);
                      if (d) {
                        const span = activeDuration && activeDuration > 1 ? activeDuration : 7;
                        const ret = addDays(d, span - 1);
                        setEndDate(ret);
                        onChange({
                          startDate: format(d, 'yyyy-MM-dd'),
                          endDate: format(ret, 'yyyy-MM-dd'),
                        });
                      }
                    }}
                    disabled={{ before: new Date() }}
                    classNames={{ today: 'rounded-md text-foreground' }}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={!startDate}
                    className="w-full rounded-3xl bg-white px-5 py-5 text-left shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] transition hover:shadow-[0_22px_48px_-20px_rgba(0,0,0,0.6)] disabled:opacity-50"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Ritorno
                    </p>
                    <p className="mt-2 flex items-center gap-2 font-display text-2xl font-semibold text-slate-900">
                      <CalendarIcon className="h-5 w-5 text-accent" />
                      {endDate ? format(endDate, 'd MMM yyyy', { locale: it }) : 'Scegli'}
                    </p>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-xl" align="end">
                  <Calendar
                    key={startDate?.toISOString() ?? 'no-start'}
                    mode="single"
                    selected={endDate}
                    defaultMonth={startDate}
                    onSelect={(d) => {
                      setEndDate(d);
                      if (d) onChange({ endDate: format(d, 'yyyy-MM-dd') });
                    }}
                    disabled={{ before: startDate || new Date() }}
                    classNames={{ today: 'rounded-md text-foreground' }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {DURATION_CARDS.map((card) => (
                <PaperChoiceCard
                  key={card.n}
                  kicker={card.kicker}
                  title={card.title}
                  body={card.body}
                  active={activeDuration === card.n}
                  onClick={() => applyDuration(card.n)}
                />
              ))}
            </div>
            <p className="text-center text-xs text-white/75">
              Accorciando i giorni togliamo le tappe secondarie. Arrivo e partenza restano.
            </p>
          </motion.div>
        ) : null}

        {phase === 'from' ? (
          <motion.div key="from" {...phaseMotion}>
            <FlightSearchPanel
              key={`${draft.startDate}-${draft.endDate}-${destCountry}`}
              variant="composer"
              hideSearchForm
              defaultOrigin="Italia"
              defaultDestination={destCountry}
              defaultStartDate={draft.startDate}
              defaultEndDate={draft.endDate}
              defaultAdults={1}
              defaultTripType="roundtrip"
              autoSearch
              cacheKey={null}
              onEditDates={() => setPhase('when')}
            />
          </motion.div>
        ) : null}

        {phase === 'who' ? (
          <motion.div key="who" {...phaseMotion} className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-white/80">Titolo del viaggio</p>
              <Input
                className="h-14 rounded-2xl composer-field text-lg"
                value={draft.title}
                onChange={(e) => {
                  titleTouched.current = true;
                  onChange({ title: e.target.value });
                }}
                placeholder="Es. Viaggio in Sicilia e a Dubai"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PhotoChoiceCard
                cover={WHO_COVERS.solo}
                kicker="Aperto"
                title="Solo"
                body="Organizzi per te. Poi si uniscono gli altri."
                active={draft.planningMode === 'solo'}
                className="min-h-[240px]"
                onClick={() =>
                  onChange({
                    planningMode: 'solo',
                    minParticipants: 4,
                    maxParticipants: 8,
                  })
                }
              />
              <PhotoChoiceCard
                cover={WHO_COVERS.group}
                kicker="Privato"
                title="Con amici"
                body="Solo chi inviti tu. Link, basta."
                active={draft.planningMode === 'group'}
                className="min-h-[240px]"
                onClick={() =>
                  onChange({
                    planningMode: 'group',
                    minParticipants: 2,
                    maxParticipants: 8,
                  })
                }
              />
            </div>

            <div className="composer-panel rounded-3xl p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <p className="text-sm font-medium text-white/80">Posti minimi</p>
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    className="h-12 rounded-2xl composer-field"
                    value={draft.minParticipants ?? 4}
                    onChange={(e) =>
                      onChange({ minParticipants: Math.max(2, Number(e.target.value) || 2) })
                    }
                  />
                </label>
                <label className="space-y-1.5">
                  <p className="text-sm font-medium text-white/80">Posti max</p>
                  <Input
                    type="number"
                    min={2}
                    max={40}
                    className="h-12 rounded-2xl composer-field"
                    value={draft.maxParticipants}
                    onChange={(e) =>
                      onChange({ maxParticipants: Math.max(2, Number(e.target.value) || 2) })
                    }
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-white/55">
                Garanzia di partenza attiva finché non si raggiunge il minimo.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full text-white hover:text-slate-900"
          disabled={phase === 'dest' && !onBack}
          onClick={goBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>

        <Button
          type="button"
          size="lg"
          className="rounded-full px-8 font-semibold shadow-lg shadow-accent/20"
          disabled={!canNext}
          onClick={goNext}
        >
          {phase === 'who' ? (
            <>
              <BookOpen className="mr-2 h-5 w-5" />
              Inizia a comporre
            </>
          ) : (
            <>
              Avanti
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <PlannerQuickSetupSheet
        open={plannerOpen}
        onOpenChange={setPlannerOpen}
        initialProfile={draft.plannerProfile}
        onSaved={(profile: PlannerProfile) => onChange({ plannerProfile: profile })}
      />
    </motion.div>
  );
}