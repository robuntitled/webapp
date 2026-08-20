'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
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
  Search,
} from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { PlannerQuickSetupSheet } from '@/components/composer/PlannerQuickSetupSheet';
import { ComposerWizardHeader } from '@/components/composer/ComposerWizardHeader';
import { syncDestinationFields, getDraftDestinations } from '@/lib/composer/draft-destinations';
import { buildOrganizerOrigin } from '@/lib/composer/origins';
import { FlightSearchPanel, type FlightOfferView } from '@/components/travel/FlightSearchPanel';
import { FlightOfferCard } from '@/components/travel/FlightOfferCard';
import { generateTripTitle } from '@/lib/composer/title-generator';
import { remapComposerDaysToDuration } from '@/lib/composer/days';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { mergeBookablePicks } from '@/lib/composer/bookable-picks';
import {
  buildFlightLegs,
  hasWideCountry,
  legKindLabel,
  needsVisitOrder,
  type FlightLegKind,
} from '@/lib/composer/flight-route';
import type { ComposerBookablePick, ComposerDraft, DestinationMeta } from '@/types/composer';
import type { PlannerProfile } from '@/types/planner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';

type ConfigPhase = 'dest' | 'when' | 'order' | 'from' | 'who';

const WHO_COVERS = {
  solo: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=80',
  open: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=900&q=80',
  friends:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
} as const;

type Audience = 'solo' | 'open' | 'friends';

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

const FLEX_DURATION_CARDS = [
  {
    n: 7 as const,
    kicker: 'Settimana',
    title: '7 giorni',
    body: 'Il ritmo giusto.',
  },
  {
    n: 10 as const,
    kicker: 'Il giro',
    title: '10 giorni',
    body: 'Ci stai tutto.',
  },
  {
    n: 12 as const,
    kicker: 'Ampio',
    title: '12 giorni',
    body: 'Tre mete, zero corsa.',
  },
];

type CheapComboView = {
  startDate: string;
  endDate: string;
  maxDays: number;
  total: number;
  currency: string;
  samplesTried: number;
  legs: Array<{
    id: string;
    from: string;
    to: string;
    date: string;
    kind: FlightLegKind;
    dayIndex: number;
    price: number;
    currency: string;
    stops: number;
    origin: string;
    destination: string;
    offerId: string;
    airline: string | null;
    airlineCode: string | null;
    airlineLogo: string | null;
    cabinClass: string | null;
    departureAt: string | null;
    arrivalAt: string | null;
    durationMinutes: number | null;
    flightNumber: string | null;
    layovers?: Array<{ airport: string; waitMinutes?: number | null }>;
  }>;
};

function GlassChoiceCard({
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
        'cursor-pointer rounded-2xl border px-4 py-3.5 text-left transition',
        active
          ? 'border-accent/70 bg-accent/15 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]'
          : 'border-white/12 bg-white/[0.05] hover:border-white/22 hover:bg-white/[0.08]',
        className
      )}
    >
      {kicker ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          {kicker}
        </p>
      ) : null}
      <p className="mt-1 font-display text-lg font-semibold text-white">{title}</p>
      {body ? <p className="mt-0.5 text-xs leading-snug text-white/60">{body}</p> : null}
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
  const [legIndex, setLegIndex] = useState(0);
  const [visitPicks, setVisitPicks] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<'flex' | 'exact'>('exact');
  const [maxDays, setMaxDays] = useState(10);
  const [windowFrom, setWindowFrom] = useState<Date>(() => addDays(new Date(), 21));
  const [windowTo, setWindowTo] = useState<Date>(() => addDays(new Date(), 81));
  const [combo, setCombo] = useState<CheapComboView | null>(null);
  const [comboLoading, setComboLoading] = useState(false);

  const defaultStart = draft.startDate ? new Date(draft.startDate) : addDays(new Date(), 14);
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    if (draft.endDate) return new Date(draft.endDate);
    return addDays(defaultStart, 7);
  });

  const selectedDestinations = getDraftDestinations(draft);
  const destCover = draft.destination ? coverForDestination(draft.destination) : null;
  const orderNeeded = needsVisitOrder(selectedDestinations);
  const extraSteps = (startedWithDest.current ? 0 : 1) + (orderNeeded ? 1 : 0);
  const microTotal = 3 + extraSteps;

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
      : phase === 'order'
        ? visitPicks.length === selectedDestinations.length && selectedDestinations.length >= 2
        : phase === 'when'
          ? orderNeeded && dateMode === 'flex'
            ? Boolean(combo)
            : Boolean(startDate && endDate && endDate >= startDate)
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
    if (phase === 'dest') {
      setVisitPicks([]);
      setPhase(orderNeeded ? 'order' : 'when');
    }
    else if (phase === 'order') {
      setCombo(null);
      setPhase('when');
    } else if (phase === 'when') {
      setLegIndex(0);
      setPhase('from');
    } else if (phase === 'from') {
      const legs = buildFlightLegs(
        selectedDestinations,
        draft.startDate,
        draft.endDate
      );
      if (legIndex < legs.length - 1) setLegIndex((i) => i + 1);
      else setPhase('who');
    } else onStart();
  };

  const goBack = () => {
    if (phase === 'dest') {
      onBack?.();
      return;
    }
    if (phase === 'order') {
      if (startedWithDest.current) onBack?.();
      else setPhase('dest');
      return;
    }
    if (phase === 'when') {
      if (orderNeeded) setPhase('order');
      else if (startedWithDest.current) onBack?.();
      else setPhase('dest');
      return;
    }
    if (phase === 'from') {
      if (legIndex > 0) setLegIndex((i) => i - 1);
      else setPhase('when');
      return;
    }
    setPhase('from');
  };

  const header =
    phase === 'dest'
      ? {
          label: 'Mete',
          title: 'Dove andiamo?',
          subtitle: 'Una o più mete. Poi date, ordine, voli.',
          micro: 1,
          total: microTotal,
        }
        : phase === 'order'
          ? {
              label: 'Ordine',
              title: 'Quale meta visiti per prima?',
              subtitle: 'Tocca in ordine. Poi scegli le date.',
              micro: startedWithDest.current ? 1 : 2,
              total: microTotal,
            }
          : phase === 'when'
            ? {
                label: 'Quando',
                title: 'Quando parti?',
                subtitle: orderNeeded
                  ? 'Scegli le date, o lascia una finestra: troviamo la combo più conveniente.'
                  : 'Date e durata. Tre ritmi. L’itinerario si piega a te.',
                micro: startedWithDest.current
                  ? orderNeeded
                    ? 2
                    : 1
                  : orderNeeded
                    ? 3
                    : 2,
                total: microTotal,
              }
          : phase === 'from'
            ? {
                label: 'Voli',
                title: 'I voli del giro',
                subtitle:
                  'Ogni tratta a sé. La salvi per il gruppo: ognuno prenota dopo, dal fornitore.',
                micro: startedWithDest.current ? (orderNeeded ? 3 : 2) : orderNeeded ? 4 : 3,
                total: microTotal,
              }
            : {
                label: 'Con chi',
                title: 'Con chi parti?',
                subtitle: 'Da solo, con una crew aperta o solo con chi inviti tu.',
                micro: microTotal,
                total: microTotal,
              };

  useEffect(() => {
    if (phase !== 'from') return;
    const next = buildOrganizerOrigin('Italia', 'IT');
    if (draft.organizerOrigin?.iata === next.iata && draft.organizerOrigin?.city === next.city) {
      return;
    }
    onChange({ organizerOrigin: next });
  }, [draft.organizerOrigin?.city, draft.organizerOrigin?.iata, onChange, phase]);

  const destCountry = selectedDestinations[0]?.label ?? draft.destination;

  const flightLegs = buildFlightLegs(
    selectedDestinations,
    draft.startDate || (startDate ? format(startDate, 'yyyy-MM-dd') : ''),
    draft.endDate || (endDate ? format(endDate, 'yyyy-MM-dd') : '')
  );
  const currentLeg = flightLegs[Math.min(legIndex, Math.max(0, flightLegs.length - 1))];
  const showInternalNote = hasWideCountry(selectedDestinations);

  const pickFlight = (offer: FlightOfferView) => {
    if (!currentLeg) return;
    const pick: ComposerBookablePick = {
      id: `flight-${currentLeg.id}`,
      kind: 'flight',
      provider: 'liteapi',
      title: `${offer.origin} → ${offer.destination}`,
      price: offer.price,
      currency: offer.currency,
      dayIndex: currentLeg.dayIndex,
      offerId: offer.offerId,
      origin: offer.origin,
      destinationIata: offer.destination,
      airline: offer.airline,
      airlineCode: offer.airlineCode,
      airlineLogo: offer.airlineLogo,
      departureAt: offer.departureAt,
      arrivalAt: offer.arrivalAt,
      durationMinutes: offer.durationMinutes,
      stops: offer.stops ?? null,
      flightNumber: offer.flightNumber,
      cabinClass: offer.cabinClass,
      hasReturn: Boolean(offer.hasReturn),
      returnOrigin: offer.returnOrigin,
      returnDestination: offer.returnDestination,
      returnAirline: offer.returnAirline,
      returnAirlineCode: offer.returnAirlineCode,
      returnAirlineLogo: offer.returnAirlineLogo,
      returnDepartureAt: offer.returnDepartureAt,
      returnArrivalAt: offer.returnArrivalAt,
      returnDurationMinutes: offer.returnDurationMinutes,
      returnStops: offer.returnStops,
      returnFlightNumber: offer.returnFlightNumber,
      adults: 1,
    };
    const withoutLeg = (draft.bookablePicks ?? []).filter((p) => p.id !== pick.id);
    onChange({ bookablePicks: mergeBookablePicks(withoutLeg, [pick]) });
    toast.success('Tratta salvata per il gruppo', {
      description: 'Chi si unisce la trova già pronta. Prenota dopo, dal fornitore.',
    });
    if (legIndex < flightLegs.length - 1) setLegIndex((i) => i + 1);
  };

  const selectedOfferId =
    (draft.bookablePicks ?? []).find((p) => p.id === `flight-${currentLeg?.id}`)?.offerId ??
    null;

  const destKey = (d: DestinationMeta) => d.osmId ?? `${d.label}-${d.lat}-${d.lng}`;

  const applyVisitOrder = (keys: string[]) => {
    if (keys.length !== selectedDestinations.length) return;
    const byKey = new Map(selectedDestinations.map((d) => [destKey(d), d]));
    const ordered = keys
      .map((k) => byKey.get(k))
      .filter((d): d is DestinationMeta => Boolean(d));
    if (ordered.length === selectedDestinations.length) {
      handleDestinationsChange(ordered);
    }
  };

  const pickVisitSlot = (dest: DestinationMeta) => {
    const key = destKey(dest);
    if (visitPicks.includes(key)) {
      const next = visitPicks.slice(0, visitPicks.indexOf(key));
      setVisitPicks(next);
      return;
    }
    const next = [...visitPicks, key];
    setVisitPicks(next);
    applyVisitOrder(next);
  };

  const applyDuration = (n: 5 | 7 | 10 | 12) => {
    const start = startDate ?? addDays(new Date(), 14);
    const end = addDays(start, n - 1);
    const startIso = format(start, 'yyyy-MM-dd');
    setStartDate(start);
    setEndDate(end);
    if (n === 7 || n === 10 || n === 12) setMaxDays(n);
    onChange({
      startDate: startIso,
      endDate: format(end, 'yyyy-MM-dd'),
      days: remapComposerDaysToDuration(draft.days, n, startIso),
    });
  };

  const applyCombo = (next: CheapComboView) => {
    setCombo(next);
    const start = parseISO(next.startDate);
    const end = parseISO(next.endDate);
    setStartDate(start);
    setEndDate(end);
    onChange({
      startDate: next.startDate,
      endDate: next.endDate,
      days: remapComposerDaysToDuration(draft.days, next.maxDays, next.startDate),
      bookablePicks: (draft.bookablePicks ?? []).filter((p) => p.kind !== 'flight'),
    });
  };

  const saveComboLeg = (leg: CheapComboView['legs'][number]) => {
    const pick: ComposerBookablePick = {
      id: `flight-${leg.id}`,
      kind: 'flight',
      provider: 'liteapi',
      title: `${leg.origin} → ${leg.destination}`,
      price: leg.price,
      currency: leg.currency,
      dayIndex: leg.dayIndex,
      offerId: leg.offerId,
      origin: leg.origin,
      destinationIata: leg.destination,
      airline: leg.airline,
      airlineCode: leg.airlineCode,
      airlineLogo: leg.airlineLogo,
      departureAt: leg.departureAt,
      arrivalAt: leg.arrivalAt,
      durationMinutes: leg.durationMinutes,
      stops: leg.stops,
      flightNumber: leg.flightNumber,
      cabinClass: leg.cabinClass,
      adults: 1,
    };
    const withoutLeg = (draft.bookablePicks ?? []).filter((p) => p.id !== pick.id);
    onChange({ bookablePicks: mergeBookablePicks(withoutLeg, [pick]) });
    toast.success('Tratta salvata per il gruppo', {
      description: 'Chi si unisce la trova già pronta. Prenota dopo, dal fornitore.',
    });
  };

  const saveAllComboLegs = (next: CheapComboView) => {
    const picks: ComposerBookablePick[] = next.legs.map((leg) => ({
      id: `flight-${leg.id}`,
      kind: 'flight',
      provider: 'liteapi',
      title: `${leg.origin} → ${leg.destination}`,
      price: leg.price,
      currency: leg.currency,
      dayIndex: leg.dayIndex,
      offerId: leg.offerId,
      origin: leg.origin,
      destinationIata: leg.destination,
      airline: leg.airline,
      airlineCode: leg.airlineCode,
      airlineLogo: leg.airlineLogo,
      departureAt: leg.departureAt,
      arrivalAt: leg.arrivalAt,
      durationMinutes: leg.durationMinutes,
      stops: leg.stops,
      flightNumber: leg.flightNumber,
      cabinClass: leg.cabinClass,
      adults: 1,
    }));
    const withoutFlights = (draft.bookablePicks ?? []).filter((p) => p.kind !== 'flight');
    onChange({ bookablePicks: mergeBookablePicks(withoutFlights, picks) });
    toast.success('Combo salvata per il gruppo', {
      description: 'Ogni tratta resta a sé. Prenoti dopo, dal fornitore.',
    });
  };

  const findCheapCombo = async () => {
    setComboLoading(true);
    setCombo(null);
    try {
      const res = await fetch('/api/liteapi/flights/cheap-combo', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations: selectedDestinations.map((d) => ({
            label: d.label,
            lat: d.lat,
            lng: d.lng,
            country: d.country,
            countryCode: d.countryCode,
            placeType: d.placeType,
            subtitle: d.subtitle,
          })),
          maxDays,
          windowStart: format(windowFrom, 'yyyy-MM-dd'),
          windowEnd: format(windowTo, 'yyyy-MM-dd'),
        }),
      });
      const data = (await res.json()) as {
        found?: boolean;
        combo?: CheapComboView;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca combo fallita');
        return;
      }
      if (!data.found || !data.combo) {
        toast.error(data.message ?? 'Nessuna combo in questa finestra');
        return;
      }
      applyCombo(data.combo);
      toast.success('Combo più conveniente trovata', {
        description: 'Stime separate per tratta. Prenoti dopo, dal fornitore.',
      });
    } catch {
      toast.error('Errore di rete');
    } finally {
      setComboLoading(false);
    }
  };

  const activeDuration =
    startDate && endDate ? differenceInCalendarDays(endDate, startDate) + 1 : null;

  const phaseMotion = {
    initial: { opacity: 0, x: 18 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -18 },
  };

  const audience: Audience =
    draft.planningMode === 'group'
      ? 'friends'
      : (draft.maxParticipants ?? 8) <= 1
        ? 'solo'
        : 'open';

  const setAudience = (next: Audience) => {
    if (next === 'solo') {
      onChange({ planningMode: 'solo', minParticipants: 1, maxParticipants: 1 });
    } else if (next === 'open') {
      onChange({ planningMode: 'solo', minParticipants: 4, maxParticipants: 8 });
    } else {
      onChange({ planningMode: 'group', minParticipants: 2, maxParticipants: 8 });
    }
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
            {orderNeeded ? (
              <>
                <div className="flex justify-center gap-2">
                  {(
                    [
                      ['exact', 'Ho già le date'],
                      ['flex', 'Date flessibili'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setDateMode(id);
                        if (id === 'flex') setCombo(null);
                      }}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                        dateMode === id
                          ? 'bg-accent text-[#0b1220]'
                          : 'bg-white/8 text-white/70 hover:bg-white/12'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {dateMode === 'flex' ? (
                  <>
                    <div className="grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="px-4 py-3.5 text-left hover:bg-white/[0.06]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                              Partire dal
                            </p>
                            <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold text-white">
                              <CalendarIcon className="h-4 w-4 text-accent" />
                              {format(windowFrom, 'd MMM yyyy', { locale: it })}
                            </p>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 rounded-xl" align="start">
                          <Calendar
                            mode="single"
                            selected={windowFrom}
                            onSelect={(d) => {
                              if (!d) return;
                              setWindowFrom(d);
                              if (windowTo < d) setWindowTo(addDays(d, 60));
                              setCombo(null);
                            }}
                            disabled={{ before: new Date() }}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="px-4 py-3.5 text-left hover:bg-white/[0.06]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                              Tornare entro
                            </p>
                            <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold text-white">
                              <CalendarIcon className="h-4 w-4 text-accent" />
                              {format(windowTo, 'd MMM yyyy', { locale: it })}
                            </p>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 rounded-xl" align="end">
                          <Calendar
                            mode="single"
                            selected={windowTo}
                            defaultMonth={windowFrom}
                            onSelect={(d) => {
                              if (!d) return;
                              setWindowTo(d);
                              setCombo(null);
                            }}
                            disabled={{ before: addDays(windowFrom, maxDays - 1) }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                        Quanti giorni
                      </p>
                      <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-2.5">
                          <button
                            type="button"
                            aria-label="Meno giorni"
                            onClick={() => {
                              setMaxDays((n) => Math.max(5, n - 1));
                              setCombo(null);
                            }}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-white hover:bg-white/16"
                          >
                            −
                          </button>
                          <div className="min-w-0 flex-1 text-center">
                            <input
                              type="number"
                              min={5}
                              max={21}
                              inputMode="numeric"
                              value={maxDays}
                              onChange={(e) => {
                                const raw = Number(e.target.value);
                                if (!Number.isFinite(raw)) return;
                                setMaxDays(Math.min(21, Math.max(1, Math.round(raw))));
                                setCombo(null);
                              }}
                              onBlur={() => setMaxDays((n) => Math.min(21, Math.max(5, n)))}
                              className="w-full bg-transparent text-center font-display text-2xl font-semibold tabular-nums text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <p className="text-xs text-white/45">giorni · da 5 a 21</p>
                          </div>
                          <button
                            type="button"
                            aria-label="Più giorni"
                            onClick={() => {
                              setMaxDays((n) => Math.min(21, n + 1));
                              setCombo(null);
                            }}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-semibold text-white hover:bg-white/16"
                          >
                            +
                          </button>
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {FLEX_DURATION_CARDS.map((card) => (
                          <GlassChoiceCard
                            key={card.n}
                            kicker={card.kicker}
                            title={card.title}
                            body={card.body}
                            active={maxDays === card.n}
                            onClick={() => {
                              setMaxDays(card.n);
                              setCombo(null);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => void findCheapCombo()}
                      disabled={comboLoading}
                      className="h-12 w-full rounded-full bg-accent text-base font-semibold text-[#0b1220] hover:bg-accent/90"
                    >
                      {comboLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-4 w-4" />
                      )}
                      {comboLoading ? 'Cerchiamo voli sostenibili…' : 'Trova la combo più conveniente'}
                    </Button>
                    {combo ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                            Stima equilibrata · {combo.maxDays} giorni
                          </p>
                          <p className="mt-1 font-display text-xl font-semibold text-white">
                            {format(parseISO(combo.startDate), 'd MMM', { locale: it })} –{' '}
                            {format(parseISO(combo.endDate), 'd MMM yyyy', { locale: it })}
                          </p>
                          <p className="mt-1 text-xs text-white/55">
                            Prezzo basso senza scali da 10 ore. Ogni tratta resta un contratto a sé.
                          </p>
                        </div>
                        <ul className="space-y-3">
                          {combo.legs.map((leg) => {
                            const saved = (draft.bookablePicks ?? []).some(
                              (p) => p.id === `flight-${leg.id}` || p.offerId === leg.offerId
                            );
                            return (
                              <li key={leg.id}>
                                <FlightOfferCard
                                  dark
                                  offer={{
                                    offerId: leg.offerId,
                                    price: leg.price,
                                    currency: leg.currency,
                                    origin: leg.origin,
                                    destination: leg.destination,
                                    airline: leg.airline,
                                    airlineCode: leg.airlineCode,
                                    airlineLogo: leg.airlineLogo,
                                    flightNumber: leg.flightNumber,
                                    departureAt: leg.departureAt,
                                    arrivalAt: leg.arrivalAt,
                                    durationMinutes: leg.durationMinutes,
                                    stops: leg.stops,
                                    layovers: leg.layovers,
                                    cabinClass: leg.cabinClass,
                                  }}
                                  kicker={`${legKindLabel(leg.kind)} · ${format(parseISO(leg.date), 'd MMM', { locale: it })}`}
                                  saved={saved}
                                  actionLabel={saved ? 'Salvata' : 'Salva per il gruppo'}
                                  onAction={() => saveComboLeg(leg)}
                                />
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex items-baseline justify-between rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm">
                          <span className="text-white/50">Somma stime (non un pacchetto)</span>
                          <span className="font-display text-2xl font-semibold text-white">
                            {combo.total.toLocaleString('it-IT')} {combo.currency}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => saveAllComboLegs(combo)}
                          className="h-12 w-full rounded-full bg-accent text-base font-semibold text-[#0b1220] hover:bg-accent/90"
                        >
                          {combo.legs.every((leg) =>
                            (draft.bookablePicks ?? []).some(
                              (p) => p.id === `flight-${leg.id}` || p.offerId === leg.offerId
                            )
                          )
                            ? 'Combo salvata'
                            : 'Salva tutta la combo'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-white/50">
                        Proviamo alcune partenze nella finestra. Ogni volo resta una tratta a sé.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05]">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="px-4 py-3.5 text-left hover:bg-white/[0.06]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                              Partenza
                            </p>
                            <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold text-white">
                              <CalendarIcon className="h-4 w-4 text-accent" />
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
                                const ret = addDays(d, maxDays - 1);
                                setEndDate(ret);
                                onChange({
                                  startDate: format(d, 'yyyy-MM-dd'),
                                  endDate: format(ret, 'yyyy-MM-dd'),
                                });
                              }
                            }}
                            disabled={{ before: new Date() }}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            disabled={!startDate}
                            className="px-4 py-3.5 text-left hover:bg-white/[0.06] disabled:opacity-50"
                          >
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                              Ritorno
                            </p>
                            <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold text-white">
                              <CalendarIcon className="h-4 w-4 text-accent" />
                              {endDate ? format(endDate, 'd MMM yyyy', { locale: it }) : 'Scegli'}
                            </p>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 rounded-xl" align="end">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            defaultMonth={startDate}
                            onSelect={(d) => {
                              setEndDate(d);
                              if (d) onChange({ endDate: format(d, 'yyyy-MM-dd') });
                            }}
                            disabled={{ before: startDate || new Date() }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {FLEX_DURATION_CARDS.map((card) => (
                        <GlassChoiceCard
                          key={card.n}
                          kicker={card.kicker}
                          title={card.title}
                          body={card.body}
                          active={activeDuration === card.n}
                          onClick={() => applyDuration(card.n)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
            <div className="grid grid-cols-2 divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05]">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="px-4 py-3.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      Partenza
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold text-white">
                      <CalendarIcon className="h-4 w-4 text-accent" />
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
                    className="px-4 py-3.5 text-left transition hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      Ritorno
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-semibold text-white">
                      <CalendarIcon className="h-4 w-4 text-accent" />
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

            <div className="grid gap-2.5 sm:grid-cols-3">
              {DURATION_CARDS.map((card) => (
                <GlassChoiceCard
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
              </>
            )}
          </motion.div>
        ) : null}

        {phase === 'order' ? (
          <motion.div key="order" {...phaseMotion} className="space-y-5">
            <p className="text-center text-sm text-white/65">
              {visitPicks.length === 0
                ? 'Prima tappa: tocca la meta da cui vuoi iniziare.'
                : visitPicks.length < selectedDestinations.length
                  ? `Poi? Tocca la tappa ${visitPicks.length + 1}.`
                  : 'Giro pronto. Ora scegli i giorni e la finestra.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {selectedDestinations.map((dest) => {
                const key = destKey(dest);
                const rank = visitPicks.indexOf(key);
                const cover = coverForDestination(dest.label);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickVisitSlot(dest)}
                    className={cn(
                      'group relative min-h-[180px] overflow-hidden rounded-2xl text-left transition',
                      rank >= 0
                        ? 'ring-2 ring-accent ring-offset-2 ring-offset-[#0b1220]'
                        : 'ring-1 ring-white/12 hover:ring-white/30'
                    )}
                  >
                    {cover ? (
                      <Image
                        src={cover}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                    <div className="relative z-10 flex h-full min-h-[180px] flex-col justify-end p-4">
                      {rank >= 0 ? (
                        <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                          Tappa {rank + 1}
                        </span>
                      ) : null}
                      <p className="font-display text-xl font-semibold text-white">{dest.label}</p>
                      {dest.subtitle ? (
                        <p className="mt-0.5 text-xs text-white/70">{dest.subtitle}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            {visitPicks.length === selectedDestinations.length ? (
              <p className="text-center text-xs text-white/50">
                Avanti: max giorni e quando puoi partire. Troviamo noi la combo.
              </p>
            ) : null}
            {visitPicks.length > 0 ? (
              <button
                type="button"
                onClick={() => setVisitPicks([])}
                className="mx-auto block text-xs text-white/45 underline underline-offset-4 hover:text-white/80"
              >
                Ricomincia l’ordine
              </button>
            ) : null}
          </motion.div>
        ) : null}

        {phase === 'from' ? (
          <motion.div key="from" {...phaseMotion} className="space-y-4">
            {flightLegs.length > 1 ? (
              <div className="flex gap-1.5">
                {flightLegs.map((leg, i) => (
                  <button
                    key={leg.id}
                    type="button"
                    onClick={() => setLegIndex(i)}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition',
                      i === legIndex ? 'bg-accent' : i < legIndex ? 'bg-accent/50' : 'bg-white/15'
                    )}
                    aria-label={`Volo ${i + 1}`}
                  />
                ))}
              </div>
            ) : null}

            {currentLeg ? (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
                      {legKindLabel(currentLeg.kind)}
                      {flightLegs.length > 1
                        ? ` · ${legIndex + 1} di ${flightLegs.length}`
                        : null}
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold text-white">
                      {currentLeg.from} → {currentLeg.to}
                    </p>
                  </div>
                </div>
                <FlightSearchPanel
                  key={currentLeg.id}
                  variant="composer"
                  hideSearchForm
                  defaultOrigin={currentLeg.from}
                  defaultDestination={currentLeg.to}
                  defaultStartDate={currentLeg.date}
                  defaultEndDate={currentLeg.endDate}
                  defaultAdults={1}
                  defaultTripType={currentLeg.tripType}
                  autoSearch
                  cacheKey={null}
                  onEditDates={() => setPhase('when')}
                  onOfferSelect={pickFlight}
                  selectedOfferId={selectedOfferId}
                  selectLabel="Salva per il gruppo"
                />
              </>
            ) : (
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
                onOfferSelect={pickFlight}
                selectedOfferId={selectedOfferId}
                selectLabel="Salva per il gruppo"
              />
            )}

            <p className="text-center text-xs text-white/50">
              Non prenoti ora. La tratta resta sul viaggio: chi si unisce la prenota dal
              fornitore, stessa offerta.
            </p>
            {showInternalNote ? (
              <p className="text-center text-xs text-white/45">
                Voli interni nella stessa meta (es. isole) li aggiungi dopo, giorno per
                giorno, se ti servono.
              </p>
            ) : null}
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

            <div className="grid gap-3 sm:grid-cols-3">
              <PhotoChoiceCard
                cover={WHO_COVERS.solo}
                kicker="Solo"
                title="Solo"
                body="Viaggi da solo. Nessun gruppo, nessun posto da riempire."
                active={audience === 'solo'}
                className="min-h-[240px]"
                onClick={() => setAudience('solo')}
              />
              <PhotoChoiceCard
                cover={WHO_COVERS.open}
                kicker="Aperto"
                title="Trova la crew"
                body="Pubblichi e si uniscono viaggiatori come te."
                active={audience === 'open'}
                className="min-h-[240px]"
                onClick={() => setAudience('open')}
              />
              <PhotoChoiceCard
                cover={WHO_COVERS.friends}
                kicker="Privato"
                title="Con amici"
                body="Solo chi inviti tu, con un link."
                active={audience === 'friends'}
                className="min-h-[240px]"
                onClick={() => setAudience('friends')}
              />
            </div>

            {audience !== 'solo' ? (
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
                  Il viaggio parte al raggiungimento del minimo posti.
                </p>
              </div>
            ) : (
              <p className="text-center text-xs text-white/55">
                Viaggio solo tuo. Potrai comunque aprirlo alla crew più avanti.
              </p>
            )}
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
          ) : phase === 'from' && currentLeg && legIndex < flightLegs.length - 1 ? (
            <>
              Prossima tratta
              <ArrowRight className="ml-2 h-4 w-4" />
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