'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  Search,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { SmartFlightCalendar } from '@/components/itineraries/SmartFlightCalendar';
import { BudgetBreakdownCard } from '@/components/itineraries/BudgetBreakdownCard';
import { MultiCountryBudgetCard } from '@/components/itineraries/MultiCountryBudgetCard';
import { OrganizzaDestinationMap } from '@/components/itineraries/OrganizzaDestinationMap';
import { FlightLegsPanel } from '@/components/itineraries/FlightLegsPanel';
import { FlightReviewCart } from '@/components/itineraries/FlightReviewCart';
import { AllegatoBLinkedNotice } from '@/components/legal/AllegatoBLinkedNotice';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { planFromMaster, getMaster } from '@/lib/itineraries/masters';
import {
  combineMultiCountryPlan,
  isCuratedMultiSelection,
  suggestPartnersFor,
} from '@/lib/itineraries/multi-country';
import {
  EMPTY_ORGANIZZA_DRAFT,
  ORGANIZZA_STEPS,
  type OrganizzaCompanyChoice,
  type OrganizzaDraft,
  type OrganizzaSelectedFlight,
  type OrganizzaStepId,
  canNavigateToOrganizzaStep,
  companyChoiceToTravelMode,
  companyCreatesPrivateTrip,
  companyShowsInviteAfterCreate,
  defaultTravelersForCompany,
  durationDaysFromRange,
  isMultiCountryDraft,
  nextOrganizzaStep,
  normalizeOrganizzaCompany,
  normalizeOrganizzaStep,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
} from '@/lib/itineraries/organizza-steps';
import { FREE_TRIP_TEMPLATE_ID } from '@/lib/itineraries/free-trip';
import { tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import { pickRecommendedFlights, type ScoredFlightInput } from '@/lib/travel/flight-score';
import { minBookableDateIso } from '@/lib/travel/flight-calendar-dates';
import {
  flightOfferCacheKey,
  getInflightOfferSearch,
  readFlightOfferCache,
  setInflightOfferSearch,
  writeFlightOfferCache,
  type CachedFlightOffer,
} from '@/lib/travel/flight-offer-cache';
import {
  buildFlightPlanForDraft,
  flightPlanAllowsContinue,
  mirrorSelectedFlightFromPlan,
} from '@/lib/travel/organizza-flight-plan';
import {
  flagStaleLegs,
  providerSearchModeForPlan,
  selectOfferOnLeg,
  type TripFlightLeg,
  type TripFlightPlan,
} from '@/lib/travel/trip-flight-legs';
import { accediHref } from '@/lib/auth/callback-url';
import { formatEuro } from '@/lib/format/euro';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'nl-organizza-draft-v3';

/** Display ISO yyyy-mm-dd as Italian gg/mm/aaaa. */
function formatDateIt(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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

type OfferRow = CachedFlightOffer;

function loadDraft(): { draft: OrganizzaDraft; step: OrganizzaStepId } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY) ??
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
  onSelect,
}: {
  dest: DestCard;
  selected: boolean;
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
          : 'border-slate-200/90 hover:border-primary/35 hover:shadow-sm'
      )}
      data-testid={`dest-card-${dest.slug}`}
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
        {selected ? (
          <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow">
            <Check className="h-4 w-4" />
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
  groupEditionCountBySlug = {},
}: {
  destinations: DestCard[];
  /** Official open editions count per destination slug (read-only hint). */
  groupEditionCountBySlug?: Record<string, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<OrganizzaStepId>('dove');
  const [draft, setDraft] = useState<OrganizzaDraft>(EMPTY_ORGANIZZA_DRAFT);
  const [destQuery, setDestQuery] = useState('');
  const [addMetaOpen, setAddMetaOpen] = useState(false);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [stopsOpen, setStopsOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const [searchTimingMs, setSearchTimingMs] = useState<{
    coldMs: number | null;
    warmMs: number | null;
    calls: number;
  }>({ coldMs: null, warmMs: null, calls: 0 });

  useEffect(() => {
    const stored = loadDraft();
    const resume = searchParams.get('ripresa') === '1';
    if (stored) {
      setDraft(stored.draft);
      setAddMetaOpen(isMultiCountryDraft(stored.draft));
      setStep(
        resume && stored.draft.selectedFlight
          ? 'riepilogo'
          : stored.step
      );
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

  function ensureFlightPlan(base?: OrganizzaDraft): TripFlightPlan {
    const d = base ?? draft;
    if (d.flightPlan && d.flightPlan.legs.length > 0) return d.flightPlan;
    const multi =
      isMultiCountryDraft(d) && d.slugs && d.durationDays
        ? (() => {
            const plan = combineMultiCountryPlan({
              slugs: d.slugs!,
              tripDays: d.durationDays!,
              vibe: d.vibe,
              company: d.company,
            });
            return plan.ok ? plan : null;
          })()
        : null;
    return buildFlightPlanForDraft(d, multi);
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

  const partnerSuggestions = useMemo(() => {
    if (!draft.slug) return [];
    return suggestPartnersFor(draft.slug, published);
  }, [draft.slug, published]);

  const partnerSearchHits = useMemo(() => {
    const q = partnerQuery.trim().toLowerCase();
    if (!q || !draft.slug) return [];
    return published.filter(
      (d) =>
        d.slug !== draft.slug &&
        !(draft.slugs ?? []).includes(d.slug) &&
        (d.name.toLowerCase().includes(q) ||
          d.slug.includes(q) ||
          d.vibe.toLowerCase().includes(q))
    );
  }, [partnerQuery, published, draft.slug, draft.slugs]);

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

  const recommended = useMemo(() => {
    const scored: ScoredFlightInput[] = offers.map((o) => ({
      id: o.id,
      price: o.price,
      stops: o.stops,
      durationMinutes: o.durationMinutes,
    }));
    return pickRecommendedFlights(scored);
  }, [offers]);

  const groupHintCount = useMemo(() => {
    const slugs = isMultiCountryDraft(draft) ? draft.slugs ?? [] : draft.slug ? [draft.slug] : [];
    return slugs.reduce((n, s) => n + (groupEditionCountBySlug[s] ?? 0), 0);
  }, [draft.slug, draft.slugs, groupEditionCountBySlug]);

  function selectPrimary(dest: DestCard) {
    const hub = getMaster(dest.slug)?.hubs[0] ?? null;
    update({
      slug: dest.slug,
      slugs: null,
      arrivalIata: hub,
      departureIata: hub,
      selectedFlight: null,
      flightPlan: null,
    });
    setAddMetaOpen(false);
    setPartnerQuery('');
    setEditingLegId(null);
  }

  function addPartner(slug: string) {
    if (!draft.slug || slug === draft.slug) return;
    const slugs = [draft.slug, slug];
    const curated = isCuratedMultiSelection(slugs);
    const pairHubs = curated
      ? combineMultiCountryPlan({ slugs, tripDays: Math.max(draft.durationDays ?? 14, 10) })
      : null;
    update({
      slugs,
      slug: slugs[0],
      selectedFlight: null,
      flightPlan: null,
      arrivalIata:
        pairHubs && pairHubs.ok
          ? pairHubs.arrivalIata
          : getMaster(slugs[0])?.hubs[0] ?? null,
      departureIata:
        pairHubs && pairHubs.ok
          ? pairHubs.departureIata
          : getMaster(slugs[1])?.hubs[0] ?? null,
    });
    setAddMetaOpen(true);
    setPartnerQuery('');
    setEditingLegId(null);
  }

  function clearPartner() {
    if (!draft.slug) return;
    update({
      slugs: null,
      arrivalIata: getMaster(draft.slug)?.hubs[0] ?? null,
      departureIata: getMaster(draft.slug)?.hubs[0] ?? null,
      selectedFlight: null,
      flightPlan: null,
    });
    setEditingLegId(null);
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
        selectedFlight: mirrorSelectedFlightFromPlan(flagged),
      });
    } else {
      update({
        ...patchedDates,
        selectedFlight: null,
        flightPlan: null,
      });
    }
  }

  function setCompany(c: OrganizzaCompanyChoice) {
    update({
      company: c,
      travelers: c === 'amici' ? Math.max(draft.travelers, 3) : defaultTravelersForCompany(c),
    });
  }

  async function fetchOffersForQuery(input: {
    origin: string;
    destination: string;
    date: string;
    tripType: 'oneway' | 'roundtrip';
    returnDate?: string | null;
    adults: number;
    signal?: AbortSignal;
  }): Promise<OfferRow[]> {
    const key = flightOfferCacheKey(input);
    const cached = readFlightOfferCache(key);
    if (cached) {
      setSearchTimingMs((t) => ({
        ...t,
        warmMs: 0,
        calls: t.calls,
      }));
      return cached.offers;
    }
    const existing = getInflightOfferSearch(key);
    if (existing) return existing;

    const started = performance.now();
    const params = new URLSearchParams({
      originIata: input.origin,
      destination: input.destination,
      startDate: input.date,
      tripType: input.tripType,
      adults: String(input.adults),
      currency: 'EUR',
    });
    if (input.tripType === 'roundtrip' && input.returnDate) {
      params.set('endDate', input.returnDate);
    }

    const promise = (async () => {
      const res = await fetch(`/api/liteapi/flights/search?${params}`, {
        credentials: 'same-origin',
        signal: input.signal,
      });
      const data = (await res.json()) as { offers?: OfferRow[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Ricerca voli non riuscita.');
      }
      const list = data.offers ?? [];
      writeFlightOfferCache(key, list);
      const elapsed = Math.round(performance.now() - started);
      setSearchTimingMs((t) => ({
        coldMs: t.coldMs == null ? elapsed : t.coldMs,
        warmMs: t.coldMs != null ? elapsed : t.warmMs,
        calls: t.calls + 1,
      }));
      return list;
    })();

    setInflightOfferSearch(key, promise);
    return promise;
  }

  async function loadOffersForLeg(leg: TripFlightLeg, plan: TripFlightPlan) {
    setOffersLoading(true);
    setOffers([]);
    const adults = Math.min(9, Math.max(1, leg.passengers || draft.travelers));
    const mode = providerSearchModeForPlan(plan);
    const controller = new AbortController();
    try {
      let list: OfferRow[] = [];
      if (
        mode.canUseClosedRoundtrip &&
        (leg.kind === 'outbound' || leg.kind === 'return') &&
        plan.legs.length === 2 &&
        draft.dateTo
      ) {
        list = await fetchOffersForQuery({
          origin: plan.legs[0]!.originIata,
          destination: plan.legs[0]!.destinationIata,
          date: plan.legs[0]!.date,
          tripType: 'roundtrip',
          returnDate: plan.legs[1]!.date,
          adults,
          signal: controller.signal,
        });
      } else {
        list = await fetchOffersForQuery({
          origin: leg.originIata,
          destination: leg.destinationIata,
          date: leg.date,
          tripType: 'oneway',
          adults,
          signal: controller.signal,
        });
      }
      setOffers(list);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      toast.error(
        /schema|column|PGRST/i.test(String((err as Error)?.message ?? ''))
          ? 'Ricerca voli non riuscita. Riprova tra poco.'
          : (err as Error)?.message ?? 'Ricerca voli non riuscita. Riprova.'
      );
    } finally {
      setOffersLoading(false);
    }
  }

  useEffect(() => {
    if (step !== 'voli' || !draft.dateFrom) return;
    const plan = ensureFlightPlan();
    if (!draft.flightPlan) {
      setFlightPlan(plan);
    }
    const target =
      (editingLegId && plan.legs.find((l) => l.id === editingLegId)) ||
      plan.legs.find((l) => l.status === 'empty' || l.status === 'stale') ||
      plan.legs[0];
    if (target) {
      if (!editingLegId) setEditingLegId(target.id);
      void loadOffersForLeg(target, plan);
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
    draft.travelers,
    editingLegId,
  ]);

  function pickFlight(kind: OrganizzaSelectedFlight['pickKind'], offerId: string) {
    const offer = offers.find((o) => o.id === offerId);
    const plan = ensureFlightPlan();
    if (!offer || !editingLegId) return;
    const leg = plan.legs.find((l) => l.id === editingLegId);
    if (!leg) return;
    const mode = providerSearchModeForPlan(plan);
    const snapshot = {
      offerId: offer.id,
      price: offer.price,
      currency: offer.currency ?? 'EUR',
      originIata: offer.origin ?? leg.originIata,
      destinationIata: offer.destination ?? leg.destinationIata,
      departureAt: offer.departureAt ?? `${leg.date}T10:00:00`,
      arrivalAt: offer.arrivalAt ?? `${leg.date}T22:00:00`,
      stops: offer.stops,
      durationMinutes: offer.durationMinutes,
      airline: offer.airline ?? null,
      capturedAt: Date.now(),
    };

    let next = selectOfferOnLeg(plan, editingLegId, snapshot);

    // Closed RT: mirror return half onto return leg when provider returns RT times
    if (
      mode.canUseClosedRoundtrip &&
      leg.kind === 'outbound' &&
      offer.returnDepartureAt &&
      next.legs[1]
    ) {
      next = selectOfferOnLeg(next, next.legs[1].id, {
        offerId: `${offer.id}:return`,
        price: 0,
        currency: offer.currency ?? 'EUR',
        originIata: next.legs[1].originIata,
        destinationIata: next.legs[1].destinationIata,
        departureAt: offer.returnDepartureAt,
        arrivalAt: offer.returnArrivalAt ?? offer.returnDepartureAt,
        stops: offer.stops,
        durationMinutes: offer.durationMinutes,
        airline: offer.airline ?? null,
        capturedAt: Date.now(),
      });
      // Attribute full RT price on outbound; return shows included
      next = {
        ...next,
        legs: next.legs.map((l, idx) =>
          idx === 0
            ? {
                ...l,
                offer: l.offer
                  ? { ...l.offer, price: offer.price }
                  : l.offer,
                labelIt: `${l.labelIt} · ${
                  kind === 'cheapest'
                    ? 'Più conveniente'
                    : kind === 'fastest'
                      ? 'Più veloce'
                      : kind === 'balanced'
                        ? 'Equilibrato'
                        : 'Scelta tua'
                }`,
              }
            : idx === 1
              ? {
                  ...l,
                  labelIt: `${l.labelIt} · incluso nell’A/R`,
                }
              : l
        ),
      };
    }

    setFlightPlan(next);
    const nextEmpty = next.legs.find(
      (l) =>
        l.id !== editingLegId &&
        (l.status === 'empty' || l.status === 'stale' || l.status === 'estimated')
    );
    if (nextEmpty) setEditingLegId(nextEmpty.id);
  }

  function skipFaresForNow() {
    if (!draft.dateFrom) return;
    const plan = ensureFlightPlan();
    const placeholder = {
      offerId: 'manual-skip',
      price: 0,
      currency: 'EUR',
      originIata: plan.legs[0]?.originIata ?? draft.originIata ?? 'MXP',
      destinationIata: plan.legs[0]?.destinationIata ?? destIata,
      departureAt: `${draft.dateFrom}T10:00:00`,
      arrivalAt: `${draft.dateFrom}T22:00:00`,
      stops: 0,
      durationMinutes: 0,
      airline: null,
      capturedAt: Date.now(),
    };
    let next = plan;
    for (const leg of plan.legs) {
      if (leg.status === 'empty' || leg.status === 'estimated') {
        next = selectOfferOnLeg(next, leg.id, {
          ...placeholder,
          offerId: `manual-skip-${leg.id}`,
          originIata: leg.originIata,
          destinationIata: leg.destinationIata,
          departureAt: `${leg.date}T10:00:00`,
          arrivalAt: `${leg.date}T22:00:00`,
        });
        // Mark as estimated-skip, not a real fare
        next = {
          ...next,
          legs: next.legs.map((l) =>
            l.id === leg.id
              ? {
                  ...l,
                  status: 'estimated' as const,
                  notesIt:
                    'Tariffa da scegliere dopo — nessuna offerta fornitori selezionata.',
                }
              : l
          ),
        };
      }
    }
    update({
      flightPlan: next,
      selectedFlight: {
        offerId: 'manual-skip',
        labelIt: 'Da scegliere dopo',
        price: 0,
        currency: 'EUR',
        originIata: draft.originIata ?? 'MXP',
        destinationIata: destIata,
        returnOriginIata,
        departureAt: `${draft.dateFrom}T10:00:00`,
        arrivalAt: `${draft.dateFrom}T22:00:00`,
        returnDepartureAt: draft.dateTo,
        returnArrivalAt: null,
        stops: 0,
        durationMinutes: 0,
        pickKind: 'manual',
      },
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
        sessionStorage.removeItem(STORAGE_KEY);
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

  const canContinue =
    (step === 'dove' && Boolean(draft.slug)) ||
    (step === 'quando' &&
      Boolean(draft.dateFrom && draft.dateTo && draft.durationDays)) ||
    (step === 'con-chi' && Boolean(draft.company)) ||
    (step === 'voli' &&
      (Boolean(draft.selectedFlight) ||
        flightPlanAllowsContinue(draft.flightPlan))) ||
    step === 'riepilogo';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-tint)]/40 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px)+var(--cookie-banner-pad,0px))]">
      <div className="nl-page w-full space-y-6 pt-6 sm:pt-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-3xl">
            Organizza il tuo viaggio
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Dove, quando, con chi — poi i voli e un riepilogo chiaro.
          </p>
        </header>

        <ol
          className="flex items-stretch gap-1 sm:gap-1.5"
          aria-label="Progresso"
          data-testid="organizza-stepper"
        >
          {ORGANIZZA_STEPS.map((s, i) => {
            const current = s.id === step;
            const complete = done.has(s.id) && !current;
            const clickable = canNavigateToOrganizzaStep(draft, s.id, step);
            return (
              <li
                key={s.id}
                className={cn(
                  'min-w-0',
                  current ? 'flex-[1.6] sm:flex-1' : 'flex-none sm:flex-1'
                )}
              >
                <button
                  type="button"
                  disabled={!clickable}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`${i + 1}. ${s.label}${complete ? ' (completato)' : ''}`}
                  onClick={() => clickable && setStep(s.id)}
                  className={cn(
                    'flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border px-1.5 text-left text-xs font-semibold sm:justify-start sm:px-2.5 sm:text-sm',
                    current && 'border-primary bg-white',
                    complete && 'border-[var(--color-border)] bg-white',
                    !current &&
                      !complete &&
                      'border-[var(--color-border)] bg-[var(--color-tint)]/60'
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
                  {/* Mobile: full label only on current step — avoids D…/Q…/C… ellipsis */}
                  <span
                    className={cn(
                      'whitespace-nowrap',
                      current ? 'inline' : 'hidden sm:inline'
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7">
          {step === 'dove' ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-extrabold">Dove vuoi andare?</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Cerca o scegli una meta. Poi, se vuoi, aggiungi un altro paese.
                </p>
              </div>

              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder="Cerca destinazione…"
                  className="w-full rounded-xl border border-[var(--color-border)] py-2.5 pl-10 pr-3 text-sm"
                  data-testid="dest-search"
                />
              </label>

              {draft.slug ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--color-tint)] px-3 py-2 text-sm">
                    <span className="font-semibold">
                      Selezionato:{' '}
                      {isMultiCountryDraft(draft) && draft.slugs
                        ? draft.slugs.map((s) => getMaster(s)?.nameIt ?? s).join(' + ')
                        : getMaster(draft.slug)?.nameIt ?? draft.slug}
                    </span>
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary"
                      onClick={() => {
                        update({
                          slug: null,
                          slugs: null,
                          arrivalIata: null,
                          departureIata: null,
                          selectedFlight: null,
                          flightPlan: null,
                        });
                        setAddMetaOpen(false);
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Cambia
                    </button>
                  </div>
                  <OrganizzaDestinationMap
                    slugs={
                      isMultiCountryDraft(draft) && draft.slugs
                        ? draft.slugs
                        : [draft.slug]
                    }
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredDests.map((dest) => {
                  const selected =
                    !isMultiCountryDraft(draft) && draft.slug === dest.slug;
                  return (
                    <DestPickCard
                      key={dest.slug}
                      dest={dest}
                      selected={selected}
                      onSelect={() => selectPrimary(dest)}
                    />
                  );
                })}
              </div>
              {filteredDests.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Nessuna destinazione per «{destQuery}».
                </p>
              ) : null}

              {draft.slug ? (
                <div className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left text-sm font-bold"
                    onClick={() => setAddMetaOpen((v) => !v)}
                  >
                    Vuoi aggiungere un&apos;altra meta?
                    {addMetaOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {addMetaOpen ? (
                    <div className="space-y-3">
                      {isMultiCountryDraft(draft) ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                            {draft.slugs?.map((s) => getMaster(s)?.nameIt ?? s).join(' + ')}
                          </span>
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={clearPartner}
                          >
                            Rimuovi seconda meta
                          </button>
                        </div>
                      ) : null}

                      {partnerSuggestions.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                            Suggerite per {getMaster(draft.slug)?.nameIt}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {partnerSuggestions.map((p) => (
                              <button
                                key={p.slug}
                                type="button"
                                onClick={() => addPartner(p.slug)}
                                className={cn(
                                  'rounded-xl border px-3 py-2.5 text-left',
                                  draft.slugs?.[1] === p.slug
                                    ? 'border-primary ring-2 ring-primary/20'
                                    : 'border-[var(--color-border)]'
                                )}
                              >
                                <p className="text-sm font-semibold">
                                  {p.emoji} {p.name}
                                  {p.kind === 'curated' ? (
                                    <span className="ml-1 text-[10px] font-bold uppercase text-emerald-700">
                                      verificata
                                    </span>
                                  ) : (
                                    <span className="ml-1 text-[10px] font-bold uppercase text-amber-700">
                                      da verificare
                                    </span>
                                  )}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                                  {p.blurbIt}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={partnerQuery}
                          onChange={(e) => setPartnerQuery(e.target.value)}
                          placeholder="Cerca un’altra meta nel catalogo…"
                          className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-10 pr-3 text-sm"
                        />
                      </label>
                      {partnerSearchHits.length > 0 ? (
                        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--color-border)] p-2">
                          {partnerSearchHits.slice(0, 12).map((d) => (
                            <li key={d.slug}>
                              <button
                                type="button"
                                className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--color-tint)]"
                                onClick={() => addPartner(d.slug)}
                              >
                                {d.emoji} {d.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {isMultiCountryDraft(draft) &&
                      !isCuratedMultiSelection(draft.slugs) ? (
                        <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                          <p className="font-semibold">
                            Combinazione non verificata: controlla collegamenti e tempi di
                            spostamento tra i paesi
                          </p>
                          {(draft.slugs ?? []).map((s) => (
                            <p key={s}>
                              {getMaster(s)?.nameIt ?? s}:{' '}
                              <a
                                href="https://www.viaggiaresicuri.it/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary underline-offset-2 hover:underline"
                              >
                                Viaggiare Sicuri
                              </a>
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 'quando' ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-extrabold">Quando vuoi partire?</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Scegli andata e ritorno. Controlliamo anche i giorni vicini.
                </p>
              </div>
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
                        draft.dateTo && draft.dateTo >= from ? draft.dateTo : from;
                      setDates(from, to);
                    }}
                  />
                  {formatDateIt(draft.dateFrom) ? (
                    <span className="mt-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {formatDateIt(draft.dateFrom)}
                      <span className="font-normal"> · gg/mm/aaaa</span>
                    </span>
                  ) : (
                    <span className="mt-1 block text-[11px] font-normal text-[var(--color-text-secondary)]">
                      Formato gg/mm/aaaa
                    </span>
                  )}
                </label>
                <label className="text-xs font-semibold">
                  Rientro
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
                  {formatDateIt(draft.dateTo) ? (
                    <span className="mt-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {formatDateIt(draft.dateTo)}
                      <span className="font-normal"> · gg/mm/aaaa</span>
                    </span>
                  ) : (
                    <span className="mt-1 block text-[11px] font-normal text-[var(--color-text-secondary)]">
                      Formato gg/mm/aaaa
                    </span>
                  )}
                </label>
              </div>
              {draft.durationDays ? (
                <p className="text-xs font-semibold text-primary">
                  {tripDurationLabelIt(draft.durationDays)}
                  {multiPlan
                    ? ` · ${multiPlan.shares.map((s) => `${s.nameIt} ${s.days}g`).join(' + ')} + trasferimento`
                    : ''}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-tint)]/40 px-3 py-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.returnHome !== false}
                    onChange={(e) => {
                      const returnHome = e.target.checked;
                      const prev = draft.flightPlan;
                      if (prev) {
                        const rebuilt = buildFlightPlanForDraft(
                          { ...draft, returnHome },
                          multiPlan
                        );
                        update({
                          returnHome,
                          flightPlan: rebuilt,
                          selectedFlight: mirrorSelectedFlightFromPlan(rebuilt),
                        });
                      } else {
                        update({ returnHome, flightPlan: null, selectedFlight: null });
                      }
                    }}
                  />
                  Includi volo di rientro
                </label>
                {draft.returnHome !== false ? (
                  <label className="text-xs font-semibold">
                    Aeroporto rientro
                    <input
                      className="ml-2 w-16 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs uppercase"
                      value={draft.homeReturnIata ?? draft.originIata ?? 'MXP'}
                      maxLength={3}
                      onChange={(e) => {
                        const homeReturnIata = e.target.value.toUpperCase();
                        const prev = draft.flightPlan;
                        if (prev) {
                          const flagged = flagStaleLegs(prev, { homeReturnIata });
                          update({
                            homeReturnIata,
                            flightPlan: flagged,
                            selectedFlight: mirrorSelectedFlightFromPlan(flagged),
                          });
                        } else {
                          update({ homeReturnIata });
                        }
                      }}
                    />
                  </label>
                ) : (
                  <p className="text-[11px] text-[var(--color-text-secondary)]">
                    Solo andata: la data di fine resta per l’itinerario, senza tratta di
                    rientro.
                  </p>
                )}
              </div>

              {draft.dateFrom ? (
                <SmartFlightCalendar
                  labelIt="Partenza · giorni vicini"
                  originIata={draft.originIata ?? 'MXP'}
                  destinationIata={destIata}
                  value={draft.dateFrom}
                  tripType="oneway"
                  onChange={(iso) => {
                    const to =
                      draft.dateTo && draft.dateTo >= iso ? draft.dateTo : iso;
                    setDates(iso, to);
                  }}
                />
              ) : null}
              {draft.dateTo && draft.returnHome !== false ? (
                <SmartFlightCalendar
                  labelIt={
                    isMultiCountryDraft(draft)
                      ? `Rientro da ${returnOriginIata} · giorni vicini`
                      : 'Rientro · giorni vicini'
                  }
                  originIata={returnOriginIata}
                  destinationIata={draft.homeReturnIata ?? draft.originIata ?? 'MXP'}
                  value={draft.dateTo}
                  tripType="oneway"
                  minDate={draft.dateFrom}
                  onChange={(iso) => {
                    if (!draft.dateFrom || iso < draft.dateFrom) return;
                    setDates(draft.dateFrom, iso);
                  }}
                />
              ) : null}
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Controlla visti e documenti su{' '}
                <a
                  href="https://www.viaggiaresicuri.it/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Viaggiare Sicuri
                </a>
                .
              </p>
            </div>
          ) : null}

          {step === 'con-chi' ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-extrabold">Con chi parti?</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Serve per budget e, se parti con amici, per il link invito.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
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
                      'rounded-2xl border px-4 py-4 text-left',
                      draft.company === opt.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-[var(--color-border)]'
                    )}
                  >
                    <p className="font-bold">{opt.label}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {opt.hint}
                    </p>
                  </button>
                ))}
              </div>
              {draft.company === 'amici' ? (
                <label className="block text-sm font-semibold">
                  Quante persone?
                  <input
                    type="number"
                    min={2}
                    max={12}
                    className="mt-1 w-28 rounded-xl border border-[var(--color-border)] px-3 py-2"
                    value={draft.travelers}
                    onChange={(e) =>
                      update({
                        travelers: Math.min(
                          12,
                          Math.max(2, Number(e.target.value) || 2)
                        ),
                      })
                    }
                  />
                </label>
              ) : null}
              {draft.company === 'amici' ? (
                <p className="inline-flex items-start gap-2 rounded-xl bg-[var(--color-tint)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                  <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  Dopo la creazione vedrai il link invito da condividere (nessun messaggio
                  inviato da noi).
                </p>
              ) : null}
              {groupHintCount > 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Ci sono partenze di gruppo per questa meta.{' '}
                  <Link
                    href="/gruppi"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Vedi Gruppi
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 'voli' ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-extrabold">Voli del viaggio</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Tratte ordinate, modificabili. Nessuna prenotazione automatica.
                  {isMultiCountryDraft(draft)
                    ? ` Arrivo ${draft.arrivalIata}, rientro da ${draft.departureIata}.`
                    : ''}
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

              {draft.flightPlan ? (
                <FlightLegsPanel
                  plan={draft.flightPlan}
                  onChange={(plan) => {
                    setFlightPlan(plan);
                    const focus =
                      plan.legs.find((l) => l.id === editingLegId) ??
                      plan.legs.find((l) => l.status === 'empty' || l.status === 'stale') ??
                      plan.legs[0];
                    if (focus) setEditingLegId(focus.id);
                  }}
                  onEditLeg={(leg) => {
                    setEditingLegId(leg.id);
                    if (draft.flightPlan) void loadOffersForLeg(leg, draft.flightPlan);
                  }}
                />
              ) : null}

              <div className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">
                      Offerte per{' '}
                      {draft.flightPlan?.legs.find((l) => l.id === editingLegId)
                        ?.labelIt ?? 'tratta'}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      Tariffe reali dal fornitore — stime itinerario restano separate.
                      {searchTimingMs.calls > 0
                        ? ` · ${searchTimingMs.calls} chiamate` +
                          (searchTimingMs.coldMs != null
                            ? ` · cold ${searchTimingMs.coldMs}ms`
                            : '') +
                          (searchTimingMs.warmMs != null
                            ? ` · warm ${searchTimingMs.warmMs}ms`
                            : '')
                        : ''}
                    </p>
                  </div>
                  {offersLoading ? (
                    <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Cerchiamo…
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {recommended.map((r) => {
                    const offer = offers.find((o) => o.id === r.offerId);
                    if (!offer) return null;
                    const activeLeg = draft.flightPlan?.legs.find(
                      (l) => l.id === editingLegId
                    );
                    const active =
                      activeLeg?.offer?.offerId === offer.id ||
                      activeLeg?.offer?.offerId === `${offer.id}:return`;
                    return (
                      <button
                        key={r.kind}
                        type="button"
                        onClick={() => pickFlight(r.kind, offer.id)}
                        className={cn(
                          'w-full rounded-2xl border px-4 py-3 text-left transition',
                          active
                            ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/20'
                            : 'border-[var(--color-border)] hover:border-primary/40'
                        )}
                        data-testid={`flight-offer-${r.kind}`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">
                          {r.labelIt}
                        </p>
                        <p className="mt-1 text-lg font-extrabold">
                          {formatEuro(offer.price, { approx: false }) ??
                            `${offer.price} €`}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {offer.stops === 0 ? 'Diretto' : `${offer.stops} scalo/i`} ·{' '}
                          {Math.round(offer.durationMinutes / 60)} h
                          {offer.origin && offer.destination
                            ? ` · ${offer.origin}→${offer.destination}`
                            : ''}
                        </p>
                      </button>
                    );
                  })}
                  {!offersLoading && recommended.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Nessuna tariffa per questa tratta. Puoi modificare aeroporti/date
                        oppure continuare senza tariffa ora.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 rounded-[10px]"
                        onClick={skipFaresForNow}
                      >
                        Continua senza tariffa ora
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {step === 'riepilogo' ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-extrabold">Riepilogo</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Compatto: espandi solo ciò che ti serve.
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-tint)] px-4 py-3 text-sm">
                <p className="font-bold">
                  {isMultiCountryDraft(draft) && draft.slugs
                    ? draft.slugs.map((s) => getMaster(s)?.nameIt ?? s).join(' + ')
                    : getMaster(draft.slug ?? '')?.nameIt ?? draft.slug}
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
                {draft.selectedFlight && draft.selectedFlight.price > 0 ? (
                  <p className="mt-1 text-xs">
                    Voli {draft.selectedFlight.labelIt}:{' '}
                    {formatEuro(draft.selectedFlight.price, { approx: false })}
                  </p>
                ) : null}
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

              {draft.flightPlan ? (
                <FlightReviewCart
                  plan={draft.flightPlan}
                  travelers={draft.travelers}
                />
              ) : null}

              {multiPlan?.unverifiedCombination ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <p className="font-semibold">{multiPlan.unverifiedNoticeIt}</p>
                  {(draft.slugs ?? []).map((s) => (
                    <p key={s} className="mt-1">
                      {getMaster(s)?.nameIt ?? s} →{' '}
                      <a
                        href="https://www.viaggiaresicuri.it/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Viaggiare Sicuri
                      </a>
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="rounded-2xl border border-[var(--color-border)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold"
                  onClick={() => setStopsOpen((v) => !v)}
                >
                  Itinerario (tappe)
                  {stopsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {stopsOpen && planDays ? (
                  <ul className="space-y-1 border-t border-[var(--color-border)] px-4 py-3 text-sm">
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
                        liveFlightEurPerPerson={draft.selectedFlight?.price ?? null}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

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
                      Ho letto le informazioni importanti (BOZZA Allegato B). Le confermerò di
                      nuovo prima di qualsiasi pagamento.
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
              {step !== 'dove' ? (
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
              {step === 'riepilogo' ? (
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
                  onClick={() => {
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
