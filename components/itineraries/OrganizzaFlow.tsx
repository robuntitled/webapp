'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { BudgetBreakdownCard } from '@/components/itineraries/BudgetBreakdownCard';
import { MultiCountryBudgetCard } from '@/components/itineraries/MultiCountryBudgetCard';
import { OrganizzaDestinationMap } from '@/components/itineraries/OrganizzaDestinationMap';
import {
  FlightLegsPanel,
  SeparateTicketsNotice,
} from '@/components/itineraries/FlightLegsPanel';
import { FlightReviewCart } from '@/components/itineraries/FlightReviewCart';
import { LegFlightStrip } from '@/components/itineraries/LegFlightStrip';
import { AllegatoBLinkedNotice } from '@/components/legal/AllegatoBLinkedNotice';
import { AirportPlaceInput } from '@/components/travel/AirportPlaceInput';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { planFromMaster, getMaster } from '@/lib/itineraries/masters';
import {
  combineMultiCountryPlan,
  isCuratedMultiSelection,
} from '@/lib/itineraries/multi-country';
import { multiCountryGateHubs } from '@/lib/travel/intercountry-legs';
import {
  AMICI_TRAVELERS_MAX,
  AMICI_TRAVELERS_MIN,
  EMPTY_ORGANIZZA_DRAFT,
  ORGANIZZA_STEPS,
  type OrganizzaCompanyChoice,
  type OrganizzaDraft,
  type OrganizzaStepId,
  type OrganizzaTripType,
  canNavigateToOrganizzaStep,
  clampAmiciTravelers,
  companyChoiceToTravelMode,
  companyCreatesPrivateTrip,
  companyShowsInviteAfterCreate,
  defaultTravelersForCompany,
  durationDaysFromRange,
  isImpostaComplete,
  isMultiCountryDraft,
  isPartenzaComplete,
  nextOrganizzaStep,
  normalizeOrganizzaCompany,
  normalizeOrganizzaStep,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
  tripTypeFromDraft,
} from '@/lib/itineraries/organizza-steps';
import { FREE_TRIP_TEMPLATE_ID } from '@/lib/itineraries/free-trip';
import { tripPlanToSelectedSnapshot } from '@/lib/itineraries/selected-flight-plan';
import { tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import { minBookableDateIso } from '@/lib/travel/flight-calendar-dates';
import {
  buildDomesticPlanForDraft,
  buildMainFlightPlanForDraft,
  flightPlanAllowsContinue,
  mergeMainAndDomestic,
  mirrorSelectedFlightFromPlan,
} from '@/lib/travel/organizza-flight-plan';
import {
  clearLegOffer,
  flagStaleLegs,
  selectOfferOnLeg,
  updateLegFields,
  type TripFlightOfferSnapshot,
  type TripFlightPlan,
} from '@/lib/travel/trip-flight-legs';
import {
  findAirportByIata,
  resolvePlaceExact,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
import { accediHref } from '@/lib/auth/callback-url';
import { formatEuro } from '@/lib/format/euro';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'nl-organizza-draft-v4';
const DEST_PREVIEW = 6;

function formatDateIt(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function placeFromIata(iata: string | null | undefined): PlaceSuggestion | null {
  if (!iata) return null;
  return resolvePlaceExact(iata) ?? null;
}

type DestCard = {
  slug: string;
  name: string;
  vibe: string;
  emoji: string;
  allowedDurations: number[];
  published?: boolean;
  continent?: string;
};

function loadDraft(): { draft: OrganizzaDraft; step: OrganizzaStepId } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY) ??
      sessionStorage.getItem('nl-organizza-draft-v3') ??
      sessionStorage.getItem('nl-organizza-draft-v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      draft: OrganizzaDraft & { company?: string | null };
      step: string;
    };
    if (!parsed?.draft) return null;
    const company = normalizeOrganizzaCompany(parsed.draft.company);
    return {
      draft: patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, {
        ...parsed.draft,
        company,
        travelers:
          parsed.draft.travelers ??
          (company ? defaultTravelersForCompany(company) : 1),
        tripType:
          parsed.draft.tripType ??
          (parsed.draft.returnHome === false ? 'oneway' : 'roundtrip'),
        domesticPlan: parsed.draft.domesticPlan ?? null,
      }),
      step: normalizeOrganizzaStep(parsed.step),
    };
  } catch {
    return null;
  }
}

function DestPickCard({
  dest,
  selected,
  orderNumber,
  onSelect,
}: {
  dest: DestCard;
  selected: boolean;
  orderNumber?: number | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group overflow-hidden rounded-xl border text-left transition',
        selected
          ? 'border-primary ring-2 ring-primary/25'
          : 'border-[var(--color-border)] hover:border-primary/35 hover:shadow-sm'
      )}
      data-testid={`dest-card-${dest.slug}`}
      aria-pressed={selected}
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={coverForDestination(dest.slug)}
          alt={dest.name}
          fill
          className="object-cover transition duration-200 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        {selected && orderNumber != null ? (
          <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow">
            {orderNumber}
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-display text-base font-semibold leading-tight text-white drop-shadow sm:text-lg">
            {dest.emoji ? `${dest.emoji} ` : ''}
            {dest.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-white/90">{dest.vibe}</p>
        </div>
      </div>
    </button>
  );
}

export function OrganizzaFlow({
  destinations,
}: {
  destinations: DestCard[];
  groupEditionCountBySlug?: Record<string, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<OrganizzaStepId>('imposta');
  const [draft, setDraft] = useState<OrganizzaDraft>(EMPTY_ORGANIZZA_DRAFT);
  const [destQuery, setDestQuery] = useState('');
  const [destShowAll, setDestShowAll] = useState(false);
  const [stopsOpen, setStopsOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [originPlace, setOriginPlace] = useState<PlaceSuggestion | null>(null);
  const [returnPlace, setReturnPlace] = useState<PlaceSuggestion | null>(null);
  const [originText, setOriginText] = useState('');
  const [returnText, setReturnText] = useState('');
  /** Clearable draft for amici count while typing (validated on blur). */
  const [amiciCountText, setAmiciCountText] = useState('3');

  useEffect(() => {
    const stored = loadDraft();
    const resume = searchParams.get('ripresa') === '1';
    if (stored) {
      setDraft(stored.draft);
      setStep(
        resume && stored.draft.selectedFlight ? 'itinerario' : stored.step
      );
      const o = placeFromIata(stored.draft.originIata);
      const r = placeFromIata(stored.draft.homeReturnIata);
      if (o) {
        setOriginPlace(o);
        setOriginText(`${o.label} (${o.code})`);
      } else {
        setOriginPlace(null);
        setOriginText('');
      }
      if (r) {
        setReturnPlace(r);
        setReturnText(`${r.label} (${r.code})`);
      } else {
        setReturnPlace(null);
        setReturnText('');
      }
      if (stored.draft.company === 'amici') {
        setAmiciCountText(String(stored.draft.travelers));
      }
    }
    const slugQ = searchParams.get('slug');
    if (slugQ && !stored?.draft.slug) {
      setDraft((d) =>
        patchOrganizzaDraft(d, {
          slug: slugQ,
          arrivalIata: getMaster(slugQ)?.hubs[0] ?? null,
          departureIata: getMaster(slugQ)?.hubs[0] ?? null,
        })
      );
    }
    setHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, step }));
    } catch {
      /* ignore */
    }
  }, [draft, step, hydrated]);

  function update(patch: Partial<OrganizzaDraft>) {
    setDraft((d) => patchOrganizzaDraft(d, patch));
  }

  function setFlightPlan(plan: TripFlightPlan) {
    update({
      flightPlan: plan,
      selectedFlight: mirrorSelectedFlightFromPlan(plan),
    });
  }

  const published = useMemo(
    () => destinations.filter((d) => d.published !== false),
    [destinations]
  );

  const filteredDests = useMemo(() => {
    const q = destQuery.trim().toLowerCase();
    if (!q) return published;
    return published.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.slug.includes(q) ||
        d.vibe.toLowerCase().includes(q) ||
        (d.continent ?? '').toLowerCase().includes(q)
    );
  }, [published, destQuery]);

  const visibleDests = destShowAll
    ? filteredDests
    : filteredDests.slice(0, DEST_PREVIEW);

  const selectedSlugs = useMemo(() => {
    if (draft.slugs && draft.slugs.length > 0) return draft.slugs;
    return draft.slug ? [draft.slug] : [];
  }, [draft.slug, draft.slugs]);

  const multiPlan = useMemo(() => {
    if (!isMultiCountryDraft(draft) || !draft.slugs || !draft.durationDays) return null;
    const plan = combineMultiCountryPlan({
      slugs: draft.slugs,
      tripDays: draft.durationDays,
      vibe: draft.vibe,
      company: draft.company,
    });
    return plan.ok ? plan : null;
  }, [draft.slugs, draft.durationDays, draft.vibe, draft.company]);

  useEffect(() => {
    if (!multiPlan) return;
    if (
      draft.arrivalIata === multiPlan.arrivalIata &&
      draft.departureIata === multiPlan.departureIata
    ) {
      return;
    }
    update({
      arrivalIata: multiPlan.arrivalIata,
      departureIata: multiPlan.departureIata,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiPlan?.arrivalIata, multiPlan?.departureIata]);

  const destIata =
    draft.arrivalIata ||
    getMaster(draft.slug ?? '')?.hubs[0] ||
    'BKK';
  const returnOriginIata =
    isMultiCountryDraft(draft) && draft.departureIata
      ? draft.departureIata
      : destIata;

  const tripType = tripTypeFromDraft(draft);

  function setTripType(t: OrganizzaTripType) {
    if (t === 'oneway') {
      update({
        tripType: 'oneway',
        returnHome: false,
        flightPlan: null,
        domesticPlan: null,
        selectedFlight: null,
      });
    } else {
      update({
        tripType: selectedSlugs.length >= 2 ? 'multi' : 'roundtrip',
        returnHome: true,
        flightPlan: null,
        domesticPlan: null,
        selectedFlight: null,
      });
    }
  }

  function applyDestinationList(nextSlugs: string[]) {
    if (nextSlugs.length === 0) {
      update({
        slug: null,
        slugs: null,
        arrivalIata: null,
        departureIata: null,
        tripType: draft.returnHome ? 'roundtrip' : 'oneway',
        selectedFlight: null,
        flightPlan: null,
        domesticPlan: null,
      });
      return;
    }
    if (nextSlugs.length === 1) {
      const slug = nextSlugs[0]!;
      const hub = getMaster(slug)?.hubs[0] ?? null;
      update({
        slug,
        slugs: null,
        arrivalIata: hub,
        departureIata: hub,
        tripType: draft.returnHome ? 'roundtrip' : 'oneway',
        selectedFlight: null,
        flightPlan: null,
        domesticPlan: null,
      });
      return;
    }
    const hubs = multiCountryGateHubs(nextSlugs);
    update({
      slug: nextSlugs[0]!,
      slugs: nextSlugs,
      tripType: 'multi',
      arrivalIata: hubs.arrivalIata,
      departureIata: hubs.departureIata,
      selectedFlight: null,
      flightPlan: null,
      domesticPlan: null,
    });
  }

  function toggleDestination(dest: DestCard) {
    const current = [...selectedSlugs];
    const idx = current.indexOf(dest.slug);
    const next =
      idx >= 0 ? current.filter((s) => s !== dest.slug) : [...current, dest.slug];
    applyDestinationList(next);
  }

  function moveSlug(from: number, to: number) {
    if (to < 0 || to >= selectedSlugs.length) return;
    const next = [...selectedSlugs];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    applyDestinationList(next);
  }

  function setDates(from: string, to: string) {
    const min = minBookableDateIso();
    const safeFrom = from < min ? min : from;
    const safeTo = to < safeFrom ? safeFrom : to;
    const days = durationDaysFromRange(safeFrom, safeTo);
    const prevPlan = draft.flightPlan;
    const patchedDates = {
      dateFrom: safeFrom,
      dateTo: safeTo,
      durationDays: days > 0 ? days : null,
    };
    if (prevPlan) {
      const flagged = flagStaleLegs(prevPlan, {
        dateFrom: safeFrom,
        dateTo: safeTo,
      });
      update({
        ...patchedDates,
        flightPlan: flagged,
        domesticPlan: null,
        selectedFlight: mirrorSelectedFlightFromPlan(flagged),
      });
    } else {
      update({
        ...patchedDates,
        selectedFlight: null,
        flightPlan: null,
        domesticPlan: null,
      });
    }
  }

  function setCompany(c: OrganizzaCompanyChoice) {
    const travelers =
      c === 'amici'
        ? clampAmiciTravelers(Math.max(draft.travelers, AMICI_TRAVELERS_MIN))
        : defaultTravelersForCompany(c);
    if (c === 'amici') setAmiciCountText(String(travelers));
    update({ company: c, travelers });
  }

  function setAmiciTravelers(n: number) {
    const next = clampAmiciTravelers(n);
    setAmiciCountText(String(next));
    update({ travelers: next });
  }

  function ensureMainPlan(base?: OrganizzaDraft): TripFlightPlan {
    const d = base ?? draft;
    if (d.flightPlan && d.flightPlan.legs.length > 0) {
      return {
        ...d.flightPlan,
        legs: d.flightPlan.legs.filter(
          (l) => l.kind !== 'domestic' && l.kind !== 'internal'
        ),
      };
    }
    return buildMainFlightPlanForDraft(d, multiPlan);
  }

  useEffect(() => {
    if (step !== 'voli' || !draft.dateFrom) return;
    const plan = ensureMainPlan();
    const needsRebuild =
      !draft.flightPlan ||
      draft.flightPlan.legs.some((l) => l.kind === 'domestic') ||
      (isMultiCountryDraft(draft) &&
        !draft.flightPlan.legs.some((l) => l.kind === 'intercountry'));
    if (needsRebuild) {
      setFlightPlan(plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    draft.dateFrom,
    draft.dateTo,
    draft.arrivalIata,
    draft.departureIata,
    draft.originIata,
    draft.homeReturnIata,
    draft.returnHome,
    draft.slugs,
    draft.travelers,
  ]);

  useEffect(() => {
    if (step !== 'itinerario') return;
    const main = ensureMainPlan();
    const domestic = buildDomesticPlanForDraft(draft, multiPlan, main);
    if (draft.domesticPlan?.legs.length) {
      const sameShape =
        draft.domesticPlan.legs.length === domestic.legs.length &&
        draft.domesticPlan.legs.every(
          (l, i) =>
            l.originIata === domestic.legs[i]?.originIata &&
            l.destinationIata === domestic.legs[i]?.destinationIata
        );
      if (sameShape) return;
    }
    update({ domesticPlan: domestic.legs.length ? domestic : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, draft.flightPlan, draft.arrivalIata, draft.departureIata]);

  function applyLegDayOffer(
    legId: string,
    date: string,
    offer: TripFlightOfferSnapshot | null
  ) {
    // Functional update: parallel LegFlightStrip auto-selects must not
    // overwrite each other via a stale draft.flightPlan closure.
    setDraft((d) => {
      let plan =
        d.flightPlan && d.flightPlan.legs.length > 0
          ? {
              ...d.flightPlan,
              legs: d.flightPlan.legs.filter(
                (l) => l.kind !== 'domestic' && l.kind !== 'internal'
              ),
            }
          : buildMainFlightPlanForDraft(d, multiPlan);
      plan = updateLegFields(plan, legId, { date });
      plan = offer
        ? selectOfferOnLeg(plan, legId, offer)
        : clearLegOffer(plan, legId);
      return patchOrganizzaDraft(d, {
        flightPlan: plan,
        selectedFlight: mirrorSelectedFlightFromPlan(plan),
        domesticPlan: null,
      });
    });
  }

  function createTrip() {
    if (!draft.slug || !draft.dateFrom || !draft.dateTo || !draft.company) {
      toast.error('Completa destinazione, date e compagnia.');
      return;
    }
    if (!draft.legalAck) {
      toast.error('Apri e conferma le informazioni importanti prima di creare.');
      setLegalOpen(true);
      return;
    }
    if (!companyCreatesPrivateTrip(draft.company)) {
      toast.error('Scelta non valida.');
      return;
    }
    const mode = companyChoiceToTravelMode(draft.company);
    if (!session?.user) {
      toast.message(
        companyShowsInviteAfterCreate(draft.company)
          ? "Crea l'account per salvare il viaggio e ottenere il link invito."
          : "Crea l'account per salvare il tuo viaggio."
      );
      router.push(accediHref('/organizza?ripresa=1', 'register'));
      return;
    }
    const curated = findItineraryBySlug(draft.slug, draft.durationDays ?? undefined);
    const templateId = curated?.template_id ?? FREE_TRIP_TEMPLATE_ID;
    const selectedFlightPlan = tripPlanToSelectedSnapshot(
      draft.flightPlan,
      draft.travelers
    );
    startTransition(async () => {
      const result = await startPracticeAction({
        templateId,
        mode,
        dateFrom: draft.dateFrom!,
        dateTo: draft.dateTo!,
        title: draft.tripName.trim() || null,
        destinationLabel:
          isMultiCountryDraft(draft) && draft.slugs
            ? draft.slugs.map((s) => getMaster(s)?.nameIt ?? s).join(' + ')
            : findCatalogDestination(draft.slug!)?.name ?? draft.slug,
        allowFreeTrip: !curated || isMultiCountryDraft(draft),
        selectedFlightPlan,
      });
      if (result?.error) {
        const err = result.error;
        toast.error(
          /schema cache|Could not find|PGRST|column/i.test(err)
            ? 'Impossibile creare il viaggio. Riprova tra poco.'
            : err
        );
        return;
      }
      try {
        // Pending stash if redirect path needs client fallback (id unknown until next page).
        if (selectedFlightPlan) {
          sessionStorage.setItem(
            'nl-pending-selected-flights',
            JSON.stringify(selectedFlightPlan)
          );
        }
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem('nl-organizza-draft-v3');
        sessionStorage.removeItem('nl-organizza-draft-v2');
      } catch {
        /* ignore */
      }
    });
  }

  const done = organizzaCompletedSteps(draft);
  const planDays =
    multiPlan?.days ??
    (draft.slug && draft.durationDays
      ? planFromMaster(
          draft.slug,
          draft.durationDays,
          (draft.vibe as 'relax' | null) ?? null
        )?.template.days
      : null);

  const reviewPlan = mergeMainAndDomestic(draft.flightPlan, draft.domesticPlan);
  const mainLegs = (draft.flightPlan?.legs ?? []).filter(
    (l) => l.kind !== 'domestic' && l.kind !== 'internal'
  );

  const canContinue =
    (step === 'imposta' && isImpostaComplete(draft)) ||
    (step === 'partenza' && isPartenzaComplete(draft)) ||
    (step === 'voli' && flightPlanAllowsContinue(draft.flightPlan)) ||
    step === 'itinerario';

  const unverifiedMulti =
    isMultiCountryDraft(draft) && !isCuratedMultiSelection(draft.slugs);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-tint)]/50 pb-[calc(12rem+env(safe-area-inset-bottom,0px)+var(--cookie-banner-pad,0px))]">
      <div className="nl-page w-full space-y-5 pt-6 sm:pt-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-3xl">
            Organizza il tuo viaggio
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Destinazione, partenza, voli principali, poi itinerario e mappa.
          </p>
        </header>

        <ol
          className="flex items-stretch gap-1.5"
          aria-label="Progresso"
          data-testid="organizza-stepper"
        >
          {ORGANIZZA_STEPS.map((s, i) => {
            const current = s.id === step;
            const complete = done.has(s.id) && !current;
            const clickable = canNavigateToOrganizzaStep(draft, s.id, step);
            return (
              <li key={s.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  disabled={!clickable}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`${i + 1}. ${s.label}${complete ? ' (completato)' : ''}`}
                  onClick={() => clickable && setStep(s.id)}
                  className={cn(
                    'flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border px-2 text-xs font-semibold sm:justify-start sm:px-3 sm:text-sm',
                    current && 'border-primary bg-white shadow-[var(--shadow-soft)]',
                    complete && 'border-[var(--color-border)] bg-white',
                    !current &&
                      !complete &&
                      'border-[var(--color-border)] bg-[var(--color-tint)]/70'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] text-white',
                      current || complete ? 'bg-primary' : 'bg-slate-400'
                    )}
                  >
                    {complete ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                  </span>
                  <span className={cn(current ? 'inline' : 'hidden sm:inline')}>
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mb-24 rounded-2xl border border-[var(--color-border)] bg-white p-4 pb-10 shadow-[var(--shadow-soft)] sm:mb-16 sm:p-6 sm:pb-12">
          {/* ——— STAGE 1: IMPOSTA (destinazioni) ——— */}
          {step === 'imposta' ? (
            <div className="space-y-5" data-testid="organizza-imposta">
              <div>
                <h2 className="font-display text-xl font-extrabold text-primary">
                  Imposta il viaggio
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Scegli destinazioni e tipo di viaggio.
                </p>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo di viaggio">
                {(
                  [
                    { id: 'roundtrip' as const, label: 'Andata e ritorno' },
                    { id: 'oneway' as const, label: 'Solo andata' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTripType(opt.id)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-xs font-bold transition',
                      (opt.id === 'oneway' ? !draft.returnHome : draft.returnHome)
                        ? 'border-primary bg-primary text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-tint)]/60 text-[var(--color-text)]'
                    )}
                    data-testid={`trip-type-${opt.id}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-[var(--color-text)]">
                  Scegli la destinazione
                </h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Tocca più paesi per un viaggio multi-meta (ordine 1, 2, 3…). Tocca di
                  nuovo per togliere.
                </p>
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={destQuery}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setDestShowAll(false);
                    }}
                    placeholder="Cerca destinazione…"
                    className="w-full rounded-xl border border-[var(--color-border)] py-2.5 pl-10 pr-3 text-sm"
                    data-testid="dest-search"
                  />
                </label>

                {selectedSlugs.length > 0 ? (
                  <div className="space-y-2 rounded-xl bg-[var(--color-tint)] px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">
                        {selectedSlugs
                          .map((s) => getMaster(s)?.nameIt ?? s)
                          .join(' → ')}
                      </span>
                      <button
                        type="button"
                        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary"
                        onClick={() => applyDestinationList([])}
                      >
                        <X className="h-3.5 w-3.5" /> Svuota
                      </button>
                    </div>
                    {selectedSlugs.length >= 2 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSlugs.map((s, i) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-2 py-1 text-[11px] font-semibold"
                          >
                            {i + 1}. {getMaster(s)?.nameIt ?? s}
                            <button
                              type="button"
                              className="text-slate-400 hover:text-primary"
                              aria-label="Sposta avanti"
                              disabled={i >= selectedSlugs.length - 1}
                              onClick={() => moveSlug(i, i + 1)}
                            >
                              →
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {unverifiedMulti ? (
                      <p
                        className="text-[11px] text-amber-900"
                        data-testid="unverified-combo-note"
                      >
                        Collegamenti da verificare tra i paesi selezionati.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visibleDests.map((dest) => {
                    const orderIdx = selectedSlugs.indexOf(dest.slug);
                    return (
                      <DestPickCard
                        key={dest.slug}
                        dest={dest}
                        selected={orderIdx >= 0}
                        orderNumber={orderIdx >= 0 ? orderIdx + 1 : null}
                        onSelect={() => toggleDestination(dest)}
                      />
                    );
                  })}
                </div>
                {!destShowAll && filteredDests.length > DEST_PREVIEW ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 w-full rounded-[10px]"
                    onClick={() => setDestShowAll(true)}
                  >
                    Mostra di più ({filteredDests.length - DEST_PREVIEW})
                  </Button>
                ) : null}
              </section>
            </div>
          ) : null}

          {/* ——— STAGE 2: PARTENZA (aeroporti / date / con chi) ——— */}
          {step === 'partenza' ? (
            <div className="space-y-5" data-testid="organizza-partenza">
              <div>
                <h2 className="font-display text-xl font-extrabold text-primary">
                  Da dove parti?
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Aeroporti, date e compagnia di viaggio.
                </p>
                {selectedSlugs.length > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {selectedSlugs.map((s) => getMaster(s)?.nameIt ?? s).join(' → ')}
                    {draft.returnHome ? '' : ' · solo andata'}
                  </p>
                ) : null}
              </div>

              <section className="space-y-3" data-testid="organizza-airports">
                <h3 className="text-sm font-bold">Da dove parti?</h3>
                <AirportPlaceInput
                  label="Aeroporto di partenza"
                  value={originText}
                  selected={originPlace}
                  onValueChange={setOriginText}
                  onSelect={(place) => {
                    setOriginPlace(place);
                    const label =
                      place.kind === 'airport'
                        ? `${place.label} (${place.code})`
                        : place.label;
                    setOriginText(label);
                    const iata =
                      place.kind === 'airport'
                        ? place.code
                        : findAirportByIata(place.code)?.iata ?? place.code;
                    const sameReturn =
                      draft.returnHome &&
                      (!draft.homeReturnIata ||
                        draft.homeReturnIata === draft.originIata);
                    if (sameReturn) {
                      setReturnPlace(place);
                      setReturnText(label);
                    }
                    const prev = draft.flightPlan;
                    const patch: Partial<OrganizzaDraft> = {
                      originIata: iata,
                      ...(sameReturn ? { homeReturnIata: iata } : {}),
                    };
                    if (prev) {
                      const flagged = flagStaleLegs(prev, {
                        homeOriginIata: iata,
                        ...(sameReturn ? { homeReturnIata: iata } : {}),
                      });
                      update({
                        ...patch,
                        flightPlan: flagged,
                        selectedFlight: mirrorSelectedFlightFromPlan(flagged),
                      });
                    } else {
                      update(patch);
                    }
                  }}
                  kinds={['airport', 'city']}
                  placeholder="Cerca città o aeroporto…"
                />

                {draft.returnHome ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold">Dove torni?</h3>
                    <AirportPlaceInput
                      label="Aeroporto di rientro"
                      value={returnText}
                      selected={returnPlace}
                      onValueChange={setReturnText}
                      onSelect={(place) => {
                        setReturnPlace(place);
                        setReturnText(
                          place.kind === 'airport'
                            ? `${place.label} (${place.code})`
                            : place.label
                        );
                        const iata =
                          place.kind === 'airport'
                            ? place.code
                            : findAirportByIata(place.code)?.iata ?? place.code;
                        const prev = draft.flightPlan;
                        if (prev) {
                          const flagged = flagStaleLegs(prev, {
                            homeReturnIata: iata,
                          });
                          update({
                            homeReturnIata: iata,
                            flightPlan: flagged,
                            selectedFlight: mirrorSelectedFlightFromPlan(flagged),
                          });
                        } else {
                          update({ homeReturnIata: iata });
                        }
                      }}
                      kinds={['airport', 'city']}
                      placeholder="Stesso di partenza o diverso…"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Solo andata: nessun volo di rientro. Imposta comunque la data di fine
                    viaggio per l’itinerario.
                  </p>
                )}
              </section>

              <section
                className="space-y-3 border-t border-[var(--color-border)] pt-4"
                data-testid="organizza-dates"
              >
                <h3 className="text-sm font-bold">Quando?</h3>
                <div className="grid gap-3 sm:grid-cols-2" lang="it-IT">
                  <label className="text-xs font-semibold">
                    Partenza
                    <input
                      type="date"
                      lang="it-IT"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
                      value={draft.dateFrom ?? ''}
                      min={minBookableDateIso()}
                      onChange={(e) => {
                        const from = e.target.value;
                        const to =
                          draft.dateTo && draft.dateTo >= from
                            ? draft.dateTo
                            : from;
                        setDates(from, to);
                      }}
                    />
                    <span className="mt-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {formatDateIt(draft.dateFrom) ?? 'gg/mm/aaaa'}
                    </span>
                  </label>
                  <label className="text-xs font-semibold">
                    {draft.returnHome ? 'Rientro' : 'Fine viaggio'}
                    <input
                      type="date"
                      lang="it-IT"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
                      value={draft.dateTo ?? ''}
                      min={draft.dateFrom ?? minBookableDateIso()}
                      onChange={(e) => {
                        if (!draft.dateFrom) return;
                        setDates(draft.dateFrom, e.target.value);
                      }}
                    />
                    <span className="mt-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {formatDateIt(draft.dateTo) ?? 'gg/mm/aaaa'}
                    </span>
                  </label>
                </div>
                {draft.durationDays ? (
                  <p className="text-xs font-semibold text-primary">
                    {tripDurationLabelIt(draft.durationDays)}
                    {multiPlan
                      ? ` · ${multiPlan.shares.map((s) => `${s.nameIt} ${s.days}g`).join(' + ')}`
                      : ''}
                  </p>
                ) : null}
              </section>

              <section
                className="space-y-3 border-t border-[var(--color-border)] pt-4"
                data-testid="organizza-company"
              >
                <h3 className="text-sm font-bold">Con chi?</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: 'solo', label: 'Da solo', hint: '1 persona' },
                      { id: 'coppia', label: 'In coppia', hint: '2 persone' },
                      { id: 'amici', label: 'Con amici', hint: 'Scegli quante' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCompany(opt.id)}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left',
                        draft.company === opt.id
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-[var(--color-border)]'
                      )}
                      data-testid={`company-${opt.id}`}
                    >
                      <p className="text-sm font-bold">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                        {opt.hint}
                      </p>
                    </button>
                  ))}
                </div>
                {draft.company === 'amici' ? (
                  <div className="space-y-2" data-testid="amici-stepper">
                    <p className="text-sm font-semibold">Quante persone?</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white disabled:opacity-40"
                        aria-label="Diminuisci"
                        disabled={draft.travelers <= AMICI_TRAVELERS_MIN}
                        onClick={() => setAmiciTravelers(draft.travelers - 1)}
                        data-testid="amici-minus"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="h-11 w-20 rounded-xl border border-[var(--color-border)] px-3 text-center text-sm font-bold"
                        value={amiciCountText}
                        aria-label="Numero persone"
                        data-testid="amici-count-input"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d]/g, '');
                          setAmiciCountText(raw);
                        }}
                        onBlur={() => {
                          if (amiciCountText.trim() === '') {
                            setAmiciTravelers(AMICI_TRAVELERS_MIN);
                            return;
                          }
                          setAmiciTravelers(Number(amiciCountText));
                        }}
                      />
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white disabled:opacity-40"
                        aria-label="Aumenta"
                        disabled={draft.travelers >= AMICI_TRAVELERS_MAX}
                        onClick={() => setAmiciTravelers(draft.travelers + 1)}
                        data-testid="amici-plus"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {AMICI_TRAVELERS_MIN}–{AMICI_TRAVELERS_MAX}
                      </span>
                    </div>
                    <p className="inline-flex items-start gap-2 rounded-xl bg-[var(--color-tint)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      Dopo la creazione vedrai il link invito (nessun messaggio inviato
                      da noi).
                    </p>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {/* ——— STAGE 3: VOLI PRINCIPALI ——— */}
          {step === 'voli' ? (
            <div className="space-y-5" data-testid="organizza-voli">
              <div>
                <h2 className="font-display text-xl font-extrabold text-primary">
                  Scegli i voli principali
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Una striscia per tratta: tocca un giorno per selezionare il volo.
                  {isMultiCountryDraft(draft)
                    ? ` ${selectedSlugs.length} paesi → ${mainLegs.length} tratte.`
                    : ''}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-tint)]/50 px-3 py-2.5 text-xs">
                <p className="font-bold text-[var(--color-text)]">
                  {selectedSlugs.map((s) => getMaster(s)?.nameIt ?? s).join(' → ') ||
                    draft.slug}
                </p>
                <p className="text-[var(--color-text-secondary)]">
                  {draft.originIata} → {destIata}
                  {draft.returnHome
                    ? ` · rientro ${returnOriginIata} → ${draft.homeReturnIata ?? draft.originIata}`
                    : ' · solo andata'}
                  {draft.dateFrom && draft.dateTo
                    ? ` · ${formatDateIt(draft.dateFrom)} – ${formatDateIt(draft.dateTo)}`
                    : ''}
                  {` · ${draft.travelers} pax`}
                </p>
              </div>

              <div className="space-y-4" data-testid="leg-calendar-strips">
                {mainLegs.map((leg, idx) => (
                  <LegFlightStrip
                    key={leg.id}
                    leg={leg}
                    adults={Math.min(9, Math.max(1, draft.travelers))}
                    minDate={
                      idx === 0
                        ? draft.dateFrom
                        : mainLegs[idx - 1]?.date ?? draft.dateFrom
                    }
                    onDateAndOffer={(date, offer) =>
                      applyLegDayOffer(leg.id, date, offer)
                    }
                  />
                ))}
              </div>

              <SeparateTicketsNotice />

              {!flightPlanAllowsContinue(draft.flightPlan) ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Continua si attiva quando ogni tratta ha un volo selezionato.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* ——— STAGE 4: ITINERARIO E MAPPA ——— */}
          {step === 'itinerario' ? (
            <div className="space-y-4" data-testid="organizza-itinerario">
              <div>
                <h2 className="font-display text-xl font-extrabold text-primary">
                  Itinerario e mappa
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Qui la mappa e gli eventuali voli domestici richiesti dall’itinerario.
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--color-tint)] px-4 py-3 text-sm">
                <p className="font-bold">
                  {selectedSlugs.map((s) => getMaster(s)?.nameIt ?? s).join(' + ') ||
                    draft.slug}
                </p>
                <p className="text-[var(--color-text-secondary)]">
                  {draft.dateFrom && draft.dateTo
                    ? `${format(parseISO(draft.dateFrom), 'd MMM', { locale: it })} → ${format(parseISO(draft.dateTo), 'd MMM yyyy', { locale: it })}`
                    : null}
                  {draft.durationDays ? ` · ${tripDurationLabelIt(draft.durationDays)}` : ''}
                  {draft.company
                    ? ` · ${
                        draft.company === 'solo'
                          ? 'Da solo'
                          : draft.company === 'coppia'
                            ? 'In coppia'
                            : `Con amici (${draft.travelers})`
                      }`
                    : ''}
                  {draft.returnHome === false ? ' · senza rientro' : ''}
                </p>
              </div>

              {draft.slug ? (
                <OrganizzaDestinationMap
                  slugs={
                    isMultiCountryDraft(draft) && draft.slugs
                      ? draft.slugs
                      : [draft.slug]
                  }
                />
              ) : null}

              {draft.domesticPlan && draft.domesticPlan.legs.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-[var(--color-border)] p-4">
                  <h3 className="text-sm font-bold">Voli domestici suggeriti</h3>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Solo se l’itinerario lo richiede (es. HAN→SGN). Le tratte tra paesi
                    sono già nei voli principali.
                  </p>
                  <FlightLegsPanel
                    compact
                    plan={draft.domesticPlan}
                    onChange={(plan) => update({ domesticPlan: plan })}
                  />
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Nessun volo domestico aggiuntivo richiesto con gli hub attuali.
                </p>
              )}

              <div className="rounded-2xl border border-[var(--color-border)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold"
                  onClick={() => setStopsOpen((v) => !v)}
                >
                  Tappe (compatto)
                  {stopsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {stopsOpen && planDays ? (
                  <ul className="max-h-56 space-y-1 overflow-y-auto border-t border-[var(--color-border)] px-4 py-3 text-sm">
                    {planDays.map((d) => (
                      <li key={d.day_number} className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">
                          G{d.day_number}
                        </span>
                        <span className="flex-1 font-medium">{d.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--color-border)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold"
                  onClick={() => setBudgetOpen((v) => !v)}
                >
                  <span>
                    Budget orientativo
                    {multiPlan?.totalPerPersonEur != null
                      ? ` · ${formatEuro(multiPlan.totalPerPersonEur, { approx: false })}/persona`
                      : ''}
                  </span>
                  {budgetOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {budgetOpen ? (
                  <div className="border-t border-[var(--color-border)] p-3">
                    {multiPlan ? (
                      <MultiCountryBudgetCard plan={multiPlan} />
                    ) : draft.slug && draft.durationDays ? (
                      <BudgetBreakdownCard
                        destinationSlug={draft.slug}
                        tripDays={draft.durationDays}
                        vibe={draft.vibe}
                        company={draft.company}
                        days={
                          planFromMaster(draft.slug, draft.durationDays)?.template.days
                        }
                        liveFlightEurPerPerson={
                          draft.selectedFlight && draft.selectedFlight.price > 0
                            ? draft.selectedFlight.price
                            : null
                        }
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {reviewPlan ? (
                <FlightReviewCart plan={reviewPlan} travelers={draft.travelers} />
              ) : null}

              <SeparateTicketsNotice />

              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-amber-950"
                  onClick={() => setLegalOpen((v) => !v)}
                >
                  Informazioni importanti
                  {legalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {legalOpen ? (
                  <div className="space-y-3 border-t border-amber-200/80 px-3 py-3">
                    <AllegatoBLinkedNotice />
                    <label className="flex items-start gap-2 text-xs text-amber-950">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={draft.legalAck}
                        onChange={(e) => update({ legalAck: e.target.checked })}
                      />
                      Ho letto le informazioni importanti (BOZZA Allegato B). Le
                      confermerò di nuovo prima di qualsiasi pagamento.
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="fixed inset-x-0 z-30 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-md"
          style={{
            bottom: 'var(--cookie-banner-pad, 0px)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="nl-page flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
              <Check className="h-3.5 w-3.5" />
              Scelte salvate su questo dispositivo
            </p>
            <div className="flex flex-wrap gap-2">
              {step !== 'imposta' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-[10px]"
                  onClick={() => {
                    const prev = prevOrganizzaStep(step);
                    if (prev) setStep(prev);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Indietro
                </Button>
              ) : null}
              {step === 'itinerario' ? (
                <Button
                  type="button"
                  variant="cta"
                  size="lg"
                  className="min-h-11 rounded-[10px]"
                  disabled={pending}
                  onClick={createTrip}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Crea viaggio
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="cta"
                  size="lg"
                  className="min-h-11 rounded-[10px]"
                  disabled={!canContinue}
                  data-testid="organizza-continua"
                  onClick={() => {
                    if (step === 'imposta') {
                      if (!isImpostaComplete(draft)) {
                        toast.error('Scegli almeno una destinazione per continuare.');
                        return;
                      }
                      setStep('partenza');
                      return;
                    }
                    if (step === 'partenza') {
                      if (!isPartenzaComplete(draft)) {
                        toast.error(
                          'Completa aeroporto di partenza, date e «Con chi» per continuare.'
                        );
                        return;
                      }
                      const plan = buildMainFlightPlanForDraft(draft, multiPlan);
                      update({ flightPlan: plan, domesticPlan: null });
                      setStep('voli');
                      return;
                    }
                    if (step === 'voli') {
                      if (!flightPlanAllowsContinue(draft.flightPlan)) {
                        toast.error(
                          'Seleziona un volo per ogni tratta (tocca un giorno sulla striscia).'
                        );
                        return;
                      }
                      setStep('itinerario');
                      return;
                    }
                    const next = nextOrganizzaStep(step, draft);
                    if (next) setStep(next);
                  }}
                >
                  Continua
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
