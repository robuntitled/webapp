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
} from 'lucide-react';
import { toast } from 'sonner';
import { startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { SmartFlightCalendar } from '@/components/itineraries/SmartFlightCalendar';
import { BudgetBreakdownCard } from '@/components/itineraries/BudgetBreakdownCard';
import { MultiCountryBudgetCard } from '@/components/itineraries/MultiCountryBudgetCard';
import { AllegatoBLinkedNotice } from '@/components/legal/AllegatoBLinkedNotice';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryBySlug } from '@/lib/itineraries/catalog';
import { planFromMaster, getMaster } from '@/lib/itineraries/masters';
import {
  combineMultiCountryPlan,
  listCuratedMultiCountryPairs,
} from '@/lib/itineraries/multi-country';
import type { CuratedMultiCountryPair } from '@/lib/itineraries/multi-country';
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
  durationDaysFromRange,
  isMultiCountryDraft,
  nextOrganizzaStep,
  organizzaCompletedSteps,
  patchOrganizzaDraft,
  prevOrganizzaStep,
} from '@/lib/itineraries/organizza-steps';
import { FREE_TRIP_TEMPLATE_ID } from '@/lib/itineraries/free-trip';
import { tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import { pickRecommendedFlights, type ScoredFlightInput } from '@/lib/travel/flight-score';
import { accediHref } from '@/lib/auth/callback-url';
import { formatEuro } from '@/lib/format/euro';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'nl-organizza-draft-v2';

type DestCard = {
  slug: string;
  name: string;
  vibe: string;
  emoji: string;
  allowedDurations: number[];
  published?: boolean;
};

type OfferRow = {
  id: string;
  price: number;
  currency?: string;
  stops: number;
  durationMinutes: number;
  origin?: string;
  destination?: string;
  departureAt?: string;
  arrivalAt?: string;
  returnDepartureAt?: string;
  returnArrivalAt?: string;
};

function loadDraft(): { draft: OrganizzaDraft; step: OrganizzaStepId } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft: OrganizzaDraft; step: OrganizzaStepId };
    if (!parsed?.draft) return null;
    return {
      draft: patchOrganizzaDraft(EMPTY_ORGANIZZA_DRAFT, parsed.draft),
      step: parsed.step ?? 'dove-quando',
    };
  } catch {
    return null;
  }
}

export function OrganizzaFlow({ destinations }: { destinations: DestCard[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<OrganizzaStepId>('dove-quando');
  const [draft, setDraft] = useState<OrganizzaDraft>(EMPTY_ORGANIZZA_DRAFT);
  const [multiMode, setMultiMode] = useState(false);
  const [stopsOpen, setStopsOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  useEffect(() => {
    const stored = loadDraft();
    const resume = searchParams.get('ripresa') === '1';
    if (stored) {
      setDraft(stored.draft);
      setMultiMode(isMultiCountryDraft(stored.draft));
      setStep(resume && stored.draft.selectedFlight ? 'riepilogo' : stored.step);
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

  const published = useMemo(
    () => destinations.filter((d) => d.published !== false),
    [destinations]
  );

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

  function selectSingle(dest: DestCard) {
    setMultiMode(false);
    update({
      slug: dest.slug,
      slugs: null,
      arrivalIata: getMaster(dest.slug)?.hubs[0] ?? null,
      departureIata: getMaster(dest.slug)?.hubs[0] ?? null,
      selectedFlight: null,
      dateFrom: draft.dateFrom,
      dateTo: draft.dateTo,
      durationDays:
        draft.dateFrom && draft.dateTo
          ? durationDaysFromRange(draft.dateFrom, draft.dateTo)
          : dest.allowedDurations[1] ?? dest.allowedDurations[0] ?? 10,
    });
  }

  function selectPair(pair: CuratedMultiCountryPair) {
    setMultiMode(true);
    update({
      slug: pair.slugs[0],
      slugs: [...pair.slugs],
      arrivalIata: pair.arrivalHubIata,
      departureIata: pair.departureHubIata,
      selectedFlight: null,
      durationDays:
        draft.dateFrom && draft.dateTo
          ? durationDaysFromRange(draft.dateFrom, draft.dateTo)
          : 14,
    });
  }

  function setDates(from: string, to: string) {
    const days = durationDaysFromRange(from, to);
    update({
      dateFrom: from,
      dateTo: to,
      durationDays: days > 0 ? days : null,
      selectedFlight: null,
    });
  }

  async function loadRecommendedOffers() {
    if (!draft.dateFrom || !draft.originIata || !destIata) return;
    setOffersLoading(true);
    setOffers([]);
    try {
      const isOpenJaw =
        isMultiCountryDraft(draft) &&
        draft.arrivalIata &&
        draft.departureIata &&
        draft.arrivalIata !== draft.departureIata;
      // Outbound search (oneway to arrival hub); full roundtrip when single country.
      const params = new URLSearchParams({
        originIata: draft.originIata,
        destination: isOpenJaw ? draft.arrivalIata! : destIata,
        startDate: draft.dateFrom,
        tripType: isOpenJaw ? 'oneway' : 'roundtrip',
        adults: '1',
        currency: 'EUR',
      });
      if (!isOpenJaw && draft.dateTo) params.set('endDate', draft.dateTo);
      const res = await fetch(`/api/liteapi/flights/search?${params}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as { offers?: OfferRow[]; error?: string };
      if (!res.ok) {
        toast.error(
          /schema|column|PGRST/i.test(data.error ?? '')
            ? 'Ricerca voli non riuscita. Riprova tra poco.'
            : data.error ?? 'Ricerca voli non riuscita. Riprova.'
        );
        return;
      }
      setOffers(data.offers ?? []);
    } catch {
      toast.error('Ricerca voli non riuscita. Controlla la connessione e riprova.');
    } finally {
      setOffersLoading(false);
    }
  }

  useEffect(() => {
    if (step === 'voli' && draft.dateFrom && draft.dateTo) {
      void loadRecommendedOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, draft.dateFrom, draft.dateTo, draft.arrivalIata, draft.originIata]);

  function pickFlight(kind: OrganizzaSelectedFlight['pickKind'], offerId: string) {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer || !draft.dateFrom) return;
    const label =
      kind === 'cheapest'
        ? 'Più conveniente'
        : kind === 'fastest'
          ? 'Più veloce'
          : kind === 'balanced'
            ? 'Equilibrato'
            : 'Scelta tua';
    update({
      selectedFlight: {
        offerId: offer.id,
        labelIt: label,
        price: offer.price,
        currency: offer.currency ?? 'EUR',
        originIata: offer.origin ?? draft.originIata ?? 'MXP',
        destinationIata: offer.destination ?? destIata,
        returnOriginIata,
        departureAt: offer.departureAt ?? `${draft.dateFrom}T10:00:00`,
        arrivalAt: offer.arrivalAt ?? `${draft.dateFrom}T22:00:00`,
        returnDepartureAt: offer.returnDepartureAt ?? draft.dateTo,
        returnArrivalAt: offer.returnArrivalAt ?? null,
        stops: offer.stops,
        durationMinutes: offer.durationMinutes,
        pickKind: kind,
      },
      // Itinerary follows the real flight airports (open-jaw order for multi).
      arrivalIata: offer.destination ?? destIata,
      departureIata: returnOriginIata,
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
      router.push('/gruppi');
      return;
    }
    const mode = companyChoiceToTravelMode(draft.company);
    if (mode === 'redirect-gruppi') {
      router.push('/gruppi');
      return;
    }
    if (!session?.user) {
      toast.message("Crea l'account per salvare il tuo viaggio.");
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
        allowFreeTrip: !curated,
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
      } catch {
        /* ignore */
      }
    });
  }

  const done = organizzaCompletedSteps(draft);
  const planDays = multiPlan?.days
    ?? (draft.slug && draft.durationDays
      ? planFromMaster(draft.slug, draft.durationDays, (draft.vibe as 'relax' | null) ?? null)
          ?.template.days
      : null);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-tint)]/40 pb-16">
      <div className="nl-page w-full space-y-6 pt-6 sm:pt-8">
        <header>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-3xl">
            Organizza il tuo viaggio
          </h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            Destinazione e date, poi i voli migliori, poi un riepilogo chiaro.
          </p>
        </header>

        <ol className="flex gap-2" aria-label="Progresso">
          {ORGANIZZA_STEPS.map((s, i) => {
            const current = s.id === step;
            const complete = done.has(s.id) && !current;
            const clickable = canNavigateToOrganizzaStep(draft, s.id, step);
            return (
              <li key={s.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && setStep(s.id)}
                  className={cn(
                    'flex w-full min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm font-semibold',
                    current && 'border-primary bg-white',
                    complete && 'border-[var(--color-border)] bg-white',
                    !current && !complete && 'border-[var(--color-border)] bg-[var(--color-tint)]/60'
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-white">
                    {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-7">
          {step === 'dove-quando' ? (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-extrabold">Dove e quando</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Scegli una meta. Per due paesi usa «Aggiungi un paese» (solo combinazioni
                  verificate).
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMultiMode(false)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold',
                    !multiMode ? 'bg-primary text-white' : 'border border-[var(--color-border)]'
                  )}
                >
                  Una meta
                </button>
                <button
                  type="button"
                  onClick={() => setMultiMode(true)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold',
                    multiMode ? 'bg-primary text-white' : 'border border-[var(--color-border)]'
                  )}
                >
                  Aggiungi un paese
                </button>
              </div>

              {multiMode ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {listCuratedMultiCountryPairs().map((pair) => {
                    const active =
                      draft.slugs?.[0] === pair.slugs[0] && draft.slugs?.[1] === pair.slugs[1];
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        onClick={() => selectPair(pair)}
                        className={cn(
                          'rounded-2xl border px-4 py-3 text-left',
                          active ? 'border-primary ring-2 ring-primary/20' : 'border-[var(--color-border)]'
                        )}
                      >
                        <p className="font-semibold">{pair.titleIt}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          {pair.blurbIt}
                        </p>
                        <p className="mt-2 text-[11px] font-medium text-primary">
                          Arrivo {pair.arrivalHubIata} · rientro da {pair.departureHubIata}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {published.map((dest) => {
                    const active = !isMultiCountryDraft(draft) && draft.slug === dest.slug;
                    return (
                      <button
                        key={dest.slug}
                        type="button"
                        onClick={() => selectSingle(dest)}
                        className={cn(
                          'overflow-hidden rounded-2xl border text-left',
                          active ? 'border-primary ring-2 ring-primary/20' : 'border-[var(--color-border)]'
                        )}
                      >
                        <div className="relative h-24 w-full">
                          <Image
                            src={coverForDestination(dest.slug)}
                            alt={dest.name}
                            fill
                            className="object-cover"
                            sizes="40vw"
                          />
                        </div>
                        <div className="p-3">
                          <p className="font-semibold">
                            {dest.emoji} {dest.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{dest.vibe}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
                <p className="text-sm font-bold">Date libere</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Niente preset fissi: l’itinerario si adatta alla lunghezza che scegli.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold">
                    Partenza
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
                      value={draft.dateFrom ?? ''}
                      onChange={(e) => {
                        const from = e.target.value;
                        const to = draft.dateTo && draft.dateTo >= from ? draft.dateTo : from;
                        setDates(from, to);
                      }}
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Rientro
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
                      value={draft.dateTo ?? ''}
                      min={draft.dateFrom ?? undefined}
                      onChange={(e) => {
                        if (!draft.dateFrom) return;
                        setDates(draft.dateFrom, e.target.value);
                      }}
                    />
                  </label>
                </div>
                {draft.durationDays ? (
                  <p className="text-xs text-primary font-semibold">
                    {tripDurationLabelIt(draft.durationDays)}
                    {multiPlan
                      ? ` · ${multiPlan.shares.map((s) => `${s.nameIt} ${s.days}g`).join(' + ')} + trasferimento`
                      : ''}
                  </p>
                ) : null}

                {draft.dateFrom ? (
                  <SmartFlightCalendar
                    labelIt="Partenza · prezzi nei ±3 giorni"
                    originIata={draft.originIata ?? 'MXP'}
                    destinationIata={destIata}
                    value={draft.dateFrom}
                    tripType="oneway"
                    onChange={(iso) => {
                      const to =
                        draft.dateTo && draft.dateTo >= iso
                          ? draft.dateTo
                          : iso;
                      setDates(iso, to);
                    }}
                  />
                ) : null}
                {draft.dateTo ? (
                  <SmartFlightCalendar
                    labelIt={
                      isMultiCountryDraft(draft)
                        ? `Rientro da ${returnOriginIata} · ±3 giorni`
                        : 'Rientro · prezzi nei ±3 giorni'
                    }
                    originIata={returnOriginIata}
                    destinationIata={draft.originIata ?? 'MXP'}
                    value={draft.dateTo}
                    tripType="oneway"
                    onChange={(iso) => {
                      if (!draft.dateFrom || iso < draft.dateFrom) return;
                      setDates(draft.dateFrom, iso);
                    }}
                  />
                ) : null}
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Controlla visti e documenti per ogni paese su{' '}
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
            </div>
          ) : null}

          {step === 'voli' ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-extrabold">Voli consigliati</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Due o tre opzioni calcolate su prezzo, scali, durata e fattibilità. Nessuna
                  prenotazione automatica.
                  {isMultiCountryDraft(draft)
                    ? ` Arrivo ${draft.arrivalIata}, rientro da ${draft.departureIata}.`
                    : ''}
                </p>
              </div>
              {offersLoading ? (
                <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cerchiamo le tariffe…
                </p>
              ) : null}
              <div className="space-y-3">
                {recommended.map((r) => {
                  const offer = offers.find((o) => o.id === r.offerId);
                  if (!offer) return null;
                  const active = draft.selectedFlight?.offerId === offer.id;
                  return (
                    <button
                      key={r.kind}
                      type="button"
                      onClick={() => pickFlight(r.kind, offer.id)}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-left',
                        active ? 'border-primary ring-2 ring-primary/20' : 'border-[var(--color-border)]'
                      )}
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        {r.labelIt}
                      </p>
                      <p className="mt-1 text-lg font-extrabold">
                        {formatEuro(offer.price, { approx: false })}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {offer.stops === 0 ? 'Diretto' : `${offer.stops} scalo/i`} ·{' '}
                        {Math.round(offer.durationMinutes / 60)} h
                      </p>
                    </button>
                  );
                })}
                {!offersLoading && recommended.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Nessuna tariffa per queste date. Torna indietro e prova un giorno vicino,
                      oppure continua: l&apos;itinerario userà hub e orari orientativi.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 rounded-[10px]"
                      onClick={() => {
                        if (!draft.dateFrom) return;
                        update({
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
                          arrivalIata: destIata,
                          departureIata: returnOriginIata,
                        });
                      }}
                    >
                      Continua senza tariffa ora
                    </Button>
                  </div>
                ) : null}
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
                </p>
                {draft.selectedFlight ? (
                  <p className="mt-1 text-xs">
                    Volo {draft.selectedFlight.labelIt}:{' '}
                    {formatEuro(draft.selectedFlight.price, { approx: false })} ·{' '}
                    {draft.selectedFlight.stops === 0
                      ? 'diretto'
                      : `${draft.selectedFlight.stops} scali`}
                  </p>
                ) : null}
              </div>

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
                    {planDays.map((d) => {
                      const arrivalHint =
                        d.day_number === 1 && draft.selectedFlight?.arrivalAt
                          ? ` · arrivo ${draft.selectedFlight.destinationIata} ${draft.selectedFlight.arrivalAt.slice(11, 16)}`
                          : '';
                      const departHint =
                        d.is_departure && draft.selectedFlight?.returnDepartureAt
                          ? ` · partenza ${draft.selectedFlight.returnOriginIata ?? draft.selectedFlight.destinationIata}`
                          : '';
                      return (
                        <li key={d.day_number} className="flex justify-between gap-2">
                          <span className="text-[var(--color-text-secondary)]">G{d.day_number}</span>
                          <span className="flex-1 font-medium">
                            {d.title}
                            {arrivalHint}
                            {departHint}
                          </span>
                        </li>
                      );
                    })}
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
                      : draft.durationDays && draft.slug
                        ? ''
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

              <div className="flex flex-wrap gap-2">
                {(['solo', 'amici', 'gruppo'] as OrganizzaCompanyChoice[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update({ company: c })}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold',
                      draft.company === c
                        ? 'bg-primary text-white'
                        : 'border border-[var(--color-border)]'
                    )}
                  >
                    {c === 'solo' ? 'Da solo' : c === 'amici' ? 'Con amici' : 'Gruppo'}
                  </button>
                ))}
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

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
              <Check className="h-3.5 w-3.5" />
              Scelte salvate su questo dispositivo
            </p>
            <div className="flex flex-wrap gap-2">
              {step !== 'dove-quando' ? (
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
                  disabled={
                    (step === 'dove-quando' &&
                      !(draft.slug && draft.dateFrom && draft.dateTo && draft.durationDays)) ||
                    (step === 'voli' && !draft.selectedFlight)
                  }
                  onClick={() => {
                    const next = nextOrganizzaStep(step, draft);
                    if (next === 'gruppi') {
                      router.push('/gruppi');
                      return;
                    }
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
