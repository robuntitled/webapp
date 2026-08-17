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
  Loader2,
  MapPin,
  Navigation,
} from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { PlannerQuickSetupSheet } from '@/components/composer/PlannerQuickSetupSheet';
import { ComposerWizardHeader } from '@/components/composer/ComposerWizardHeader';
import { syncDestinationFields, getDraftDestinations } from '@/lib/composer/draft-destinations';
import { buildOrganizerOrigin } from '@/lib/composer/origins';
import { generateTripTitle } from '@/lib/composer/title-generator';
import { remapComposerDaysToDuration } from '@/lib/composer/days';
import { coverForDestination } from '@/lib/composer/destination-covers';
import type { ComposerDraft, DestinationMeta } from '@/types/composer';
import type { PlannerProfile } from '@/types/planner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type ConfigPhase = 'dest' | 'when' | 'from' | 'who';

const WHO_COVERS = {
  solo: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=80',
  group:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
} as const;

const FROM_COVER =
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80';

const DURATION_CARDS = [
  {
    n: 5 as const,
    kicker: 'Ponte',
    title: '5 giorni',
    body: 'Il lungo weekend che vale un viaggio.',
    cover:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
  },
  {
    n: 7 as const,
    kicker: 'Settimana',
    title: '7 giorni',
    body: 'Il ritmo giusto. Niente fretta.',
    cover:
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80',
  },
  {
    n: 10 as const,
    kicker: 'Il giro',
    title: '10 giorni',
    body: 'Ci stai tutto. Zero rimpianti.',
    cover:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
  },
];

function PhotoChoiceCard({
  cover,
  active,
  onClick,
  kicker,
  title,
  body,
  className,
}: {
  cover: string;
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
        'group relative min-h-[196px] overflow-hidden rounded-3xl text-left shadow-[0_24px_50px_-28px_rgba(0,0,0,0.7)] transition duration-300',
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
    </button>
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
  profileCity,
  profileCountry,
}: ComposerLandingStepProps) {
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [originCityInput, setOriginCityInput] = useState(draft.organizerOrigin?.city ?? '');
  const titleTouched = useRef(false);
  const profileOriginApplied = useRef(false);
  const startedWithDest = useRef(Boolean(draft.destination?.trim()));
  const [phase, setPhase] = useState<ConfigPhase>(() =>
    draft.destination?.trim() ? 'when' : 'dest'
  );

  useEffect(() => {
    setOriginCityInput(draft.organizerOrigin?.city ?? '');
  }, [draft.organizerOrigin?.city]);

  // Prefill da profilo se manca origin
  useEffect(() => {
    if (profileOriginApplied.current || draft.organizerOrigin || !profileCity?.trim()) return;
    profileOriginApplied.current = true;
    const origin = buildOrganizerOrigin(profileCity, profileCountry ?? undefined);
    onChange({ organizerOrigin: origin });
    setOriginCityInput(origin.city);
  }, [draft.organizerOrigin, profileCity, profileCountry, onChange]);

  const applyOriginCity = (city: string, country?: string) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    const origin = buildOrganizerOrigin(trimmed, country);
    onChange({ organizerOrigin: origin });
    setOriginCityInput(origin.city);
  };

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
          ? Boolean(draft.organizerOrigin?.city)
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
            subtitle: 'Date e durata. L’itinerario si piega ai giorni che scegli.',
            micro: startedWithDest.current ? 1 : 2,
            total: startedWithDest.current ? 3 : 4,
          }
        : phase === 'from'
          ? {
              label: 'Da dove',
              title: 'Da dove voli?',
              subtitle: 'La tua città. Da qui partono i voli del gruppo.',
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

  /** Come in ba5c42a: reverse Nominatim; prova prima API server (User-Agent valido). */
  const resolveCoordsToOrigin = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `/api/places/reverse?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`
      );
      const data = (await res.json()) as {
        place?: { label: string; country?: string };
      };
      if (res.ok && data.place?.label) {
        return buildOrganizerOrigin(data.place.label, data.place.country);
      }
    } catch {
      // fallback client come ba5c42a
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=it`
    );
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; country?: string };
      display_name?: string;
    };
    const city =
      data.address?.city ?? data.address?.town ?? data.address?.village ?? 'La tua città';
    const label = data.display_name?.split(',')[0] ?? city;
    return buildOrganizerOrigin(label, data.address?.country);
  };

  /**
   * Flusso GPS come ba5c42a: getCurrentPosition + high accuracy.
   * Permissions-Policy resta geolocation=(self) (in ba5c42a era =() e andava bloccata).
   */
  const detectOrigin = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalizzazione non supportata');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const origin = await resolveCoordsToOrigin(latitude, longitude);
          onChange({ organizerOrigin: origin });
          setOriginCityInput(origin.city);
          toast.success(`Partenza da ${origin.city}`);
        } catch {
          toast.error('Impossibile risolvere la posizione');
        } finally {
          setGeoLoading(false);
        }
      },
      async (err) => {
        // Fallback rete solo se GPS non disponibile/timeout (non se permesso negato)
        if (err.code !== err.PERMISSION_DENIED) {
          try {
            const res = await fetch('/api/geo/approx');
            if (res.ok) {
              const data = (await res.json()) as {
                city?: string | null;
                country?: string | null;
                lat?: number | null;
                lng?: number | null;
              };
              if (data.lat != null && data.lng != null) {
                const origin = await resolveCoordsToOrigin(data.lat, data.lng);
                onChange({ organizerOrigin: origin });
                setOriginCityInput(origin.city);
                toast.success(`Partenza stimata: ${origin.city}`);
                setGeoLoading(false);
                return;
              }
              if (data.city?.trim()) {
                applyOriginCity(data.city, data.country ?? undefined);
                toast.success(`Partenza stimata: ${data.city.trim()}`);
                setGeoLoading(false);
                return;
              }
            }
          } catch {
            // ignore
          }
        }
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Permesso posizione negato');
        } else {
          toast.error('Posizione non disponibile — inserisci la città a mano');
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

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
      className="mx-auto max-w-3xl pb-24"
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
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
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
                    className="rounded-3xl bg-white px-5 py-5 text-left shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] transition hover:shadow-[0_22px_48px_-20px_rgba(0,0,0,0.6)]"
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
                    className="rounded-3xl bg-white px-5 py-5 text-left shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] transition hover:shadow-[0_22px_48px_-20px_rgba(0,0,0,0.6)] disabled:opacity-50"
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
                <PhotoChoiceCard
                  key={card.n}
                  cover={card.cover}
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
            <div className="relative overflow-hidden rounded-[2rem] shadow-[0_28px_60px_-32px_rgba(0,0,0,0.75)]">
              <div className="relative h-[280px] sm:h-[320px]">
                <Image
                  src={FROM_COVER}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                  Gate di partenza
                </p>
                <h3 className="mt-1 font-display text-3xl font-semibold text-white">
                  {draft.organizerOrigin?.city ?? 'Da dove voli?'}
                </h3>
                {draft.organizerOrigin ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                    <MapPin className="h-4 w-4 text-accent" />
                    {draft.organizerOrigin.city}
                    {draft.organizerOrigin.iata ? ` · ${draft.organizerOrigin.iata}` : ''}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-white/75">GPS o città. Da qui partono i voli.</p>
                )}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 shrink-0 rounded-2xl"
                    onClick={detectOrigin}
                    disabled={geoLoading}
                  >
                    {geoLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4 text-accent" />
                    )}
                    Usa la mia posizione
                  </Button>
                  <Input
                    placeholder="Oppure digita la città"
                    className="h-12 rounded-2xl composer-field"
                    value={originCityInput}
                    onChange={(e) => setOriginCityInput(e.target.value)}
                    onBlur={() => applyOriginCity(originCityInput)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyOriginCity(originCityInput);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
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