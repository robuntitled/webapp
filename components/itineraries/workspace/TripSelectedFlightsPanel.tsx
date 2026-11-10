'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Plane, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EditSelectedFlightLegModal } from '@/components/itineraries/workspace/EditSelectedFlightLegModal';
import { Button } from '@/components/ui/button';
import { formatEuro } from '@/lib/format/euro';
import {
  coverageForUser,
  coverageStatusLabelIt,
  parseFlightBookingCoverage,
  participantFlightUiStatus,
} from '@/lib/itineraries/flight-booking-coverage';
import {
  buildCheckoutDraftFromLegs,
  formatClockIt,
  formatDurationIt,
  formatLegDateIt,
  formatStopsIt,
  isSelectedLegBooked,
  legKindLabelIt,
  sumSelectedLegsPerPerson,
  sumSelectedPlanPerPerson,
} from '@/lib/itineraries/selected-flight-display';
import {
  loadPracticeFlightsLocal,
  parseSelectedFlightPlan,
  purchasableLegsFromSelected,
  savePracticeFlightsLocal,
  snapshotFromPlannedLegs,
  type SelectedFlightLegSnapshot,
  type SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';
import { listPracticeFlightBookings } from '@/lib/itineraries/practice-flights';
import { saveFlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';
import type { EditionMemberCard } from '@/lib/itineraries/bookings';
import type { PracticeRow } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

export type TripParticipant = {
  userId: string;
  name: string;
  isOwner: boolean;
  isSelf: boolean;
  flightsBought: boolean;
};

type Props = {
  practice: PracticeRow;
  currentUserId: string;
  participants: TripParticipant[];
  /** Owner-visible member cards for names in coverage. */
  members?: EditionMemberCard[];
  canEdit: boolean;
};

function resolvePlan(practice: PracticeRow): SelectedFlightPlanSnapshot | null {
  return (
    parseSelectedFlightPlan(practice.selected_flight_plan) ??
    snapshotFromPlannedLegs(practice.planned_legs)
  );
}

export function TripSelectedFlightsPanel({
  practice,
  currentUserId,
  participants,
  canEdit,
}: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<SelectedFlightPlanSnapshot | null>(() =>
    resolvePlan(practice)
  );
  const [editLegId, setEditLegId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [payOthersOpen, setPayOthersOpen] = useState(false);
  const [selectedPayIds, setSelectedPayIds] = useState<string[]>(() => [currentUserId]);
  const [separateLegs, setSeparateLegs] = useState(false);

  const coverage = useMemo(
    () =>
      parseFlightBookingCoverage(
        (practice as { flight_booking_coverage?: unknown }).flight_booking_coverage
      ),
    [practice]
  );

  const bookings = useMemo(() => listPracticeFlightBookings(practice), [practice]);

  useEffect(() => {
    const server = resolvePlan(practice);
    const local = loadPracticeFlightsLocal(practice.id);
    const next = server ?? local;
    if (next) {
      setPlan(next);
      savePracticeFlightsLocal(practice.id, next);
    }
  }, [practice]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of participants) m.set(p.userId, p.name);
    return m;
  }, [participants]);

  const purchasable = useMemo(() => purchasableLegsFromSelected(plan), [plan]);
  const unbookedLegs = useMemo(
    () => purchasable.filter((l) => !isSelectedLegBooked(l, bookings)),
    [purchasable, bookings]
  );
  const perPersonTotal = useMemo(() => sumSelectedPlanPerPerson(plan), [plan]);
  const unbookedPerPerson = useMemo(
    () => sumSelectedLegsPerPerson(unbookedLegs),
    [unbookedLegs]
  );

  function isPersonFullyCovered(userId: string): boolean {
    const cov = coverageForUser(coverage, userId);
    if (cov && (cov.status === 'booked' || cov.status === 'covered')) {
      // Coverage is person-level; still allow remaining legs if plan has unbooked offers.
      return unbookedLegs.length === 0;
    }
    const p = participants.find((x) => x.userId === userId);
    if (p?.flightsBought && unbookedLegs.length === 0) return true;
    return false;
  }

  function openEdit(legId?: string) {
    if (!plan) {
      const seeded = seedEmptyFlightPlan(practice);
      setPlan(seeded);
      setEditLegId(seeded.legs[0]?.id ?? null);
      setPicking(true);
      return;
    }
    setEditLegId(legId ?? plan.legs[0]?.id ?? null);
  }

  function openPayOthers() {
    const defaults = participants
      .filter((p) => !isPersonFullyCovered(p.userId))
      .map((p) => p.userId);
    const withSelf = defaults.includes(currentUserId)
      ? defaults
      : isPersonFullyCovered(currentUserId)
        ? defaults
        : [currentUserId, ...defaults];
    setSelectedPayIds(withSelf.length ? withSelf : [currentUserId]);
    setPayOthersOpen(true);
  }

  function togglePay(userId: string) {
    if (isPersonFullyCovered(userId)) return;
    setSelectedPayIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  }

  function stashCoverageIntent(ids: string[]) {
    try {
      sessionStorage.setItem(
        `nl-flight-coverage-intent-${practice.id}`,
        JSON.stringify({
          bookerUserId: currentUserId,
          beneficiaryIds: ids,
        })
      );
    } catch {
      /* ignore */
    }
  }

  function goCheckout(beneficiaryIds: string[], legs: SelectedFlightLegSnapshot[], mode: 'all' | 'separate') {
    const ids = beneficiaryIds.filter((id) => !isPersonFullyCovered(id));
    if (!ids.length) {
      toast.error('Seleziona almeno una persona da prenotare.');
      return;
    }
    if (!legs.length) {
      toast.error(
        unbookedLegs.length === 0
          ? 'Tutte le tratte selezionate risultano già prenotate.'
          : 'Seleziona i voli prima di prenotare.'
      );
      return;
    }
    const draft = buildCheckoutDraftFromLegs({
      legs,
      adults: Math.max(1, ids.length),
      practiceId: practice.id,
      mode,
    });
    if (!draft) {
      toast.error('Seleziona i voli prima di prenotare.');
      return;
    }
    saveFlightCheckoutDraft(draft);
    stashCoverageIntent(ids);
    router.push('/prenota/voli/checkout');
  }

  function goCheckoutAll(beneficiaryIds: string[]) {
    goCheckout(beneficiaryIds, unbookedLegs, 'all');
  }

  function goCheckoutOne(beneficiaryIds: string[], leg: SelectedFlightLegSnapshot) {
    goCheckout(beneficiaryIds, [leg], 'separate');
  }

  if (!plan || plan.legs.length === 0) {
    return (
      <div className="space-y-4" data-testid="trip-voli-empty">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
          <Plane className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-800">Nessun volo selezionato</p>
          <p className="mt-1 text-sm text-slate-500">
            Scegli le tratte del viaggio. La ricerca non parte da sola: restano i voli che
            salvi.
          </p>
          {canEdit ? (
            <Button
              type="button"
              className="mt-5 rounded-full"
              onClick={() => openEdit()}
              data-testid="trip-voli-scegli"
            >
              Scegli i voli
            </Button>
          ) : null}
        </div>
        {plan ? (
          <EditSelectedFlightLegModal
            open={Boolean(editLegId) || picking}
            onOpenChange={(o) => {
              if (!o) {
                setEditLegId(null);
                setPicking(false);
              }
            }}
            practiceId={practice.id}
            plan={plan}
            legId={editLegId ?? plan.legs[0]?.id ?? null}
            onSaved={(next) => {
              setPlan(next);
              savePracticeFlightsLocal(practice.id, next);
              router.refresh();
            }}
          />
        ) : null}
      </div>
    );
  }

  const canPay = unbookedLegs.length > 0;

  return (
    <div className="space-y-5" data-testid="trip-voli-fixed">
      <ul className="space-y-2.5">
        {plan.legs.map((leg) => {
          const booked = isSelectedLegBooked(leg, bookings);
          return (
            <li
              key={leg.id}
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
              data-testid={`trip-voli-leg-${leg.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {legKindLabelIt(leg.kind)}
                    </p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        booked
                          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                          : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                      )}
                      data-testid={`trip-voli-leg-status-${leg.id}`}
                    >
                      {booked ? 'Prenotato' : 'Da prenotare'}
                    </span>
                  </div>
                  <p className="mt-0.5 font-display text-base font-semibold text-slate-900">
                    {leg.originIata} → {leg.destinationIata}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatLegDateIt(leg.date)}
                    {leg.departureAt
                      ? ` · ${formatClockIt(leg.departureAt)}–${formatClockIt(leg.arrivalAt)}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {formatStopsIt(leg.stops)} · {formatDurationIt(leg.durationMinutes)}
                    {leg.airline ? ` · ${leg.airline}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {leg.price != null ? (
                    <p className="text-sm font-extrabold tabular-nums text-slate-900">
                      {formatEuro(leg.price)}
                      <span className="block text-[10px] font-medium text-slate-500">
                        a persona
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700">Da completare</p>
                  )}
                  {canEdit && !booked ? (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                      onClick={() => openEdit(leg.id)}
                      data-testid={`trip-voli-edit-${leg.id}`}
                    >
                      <Pencil className="h-3 w-3" />
                      Modifica
                    </button>
                  ) : null}
                  {separateLegs && !booked && leg.offerId && leg.price != null ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 h-9 rounded-full px-3 text-xs"
                      onClick={() => goCheckoutOne([currentUserId], leg)}
                      data-testid={`trip-voli-prenota-leg-${leg.id}`}
                    >
                      Prenota
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full rounded-full"
          onClick={() => openEdit()}
          data-testid="trip-voli-modifica"
        >
          <Pencil className="h-4 w-4" />
          Modifica voli
        </Button>
      ) : null}

      {canPay ? (
        <label
          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3"
          data-testid="trip-voli-separate-toggle"
        >
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={separateLegs}
            onChange={(e) => setSeparateLegs(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Paga tratte separatamente
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              Ogni tratta è un biglietto one-way. Di default le paghi insieme in un unico
              checkout; attiva questa opzione per prenotare una tratta alla volta.
            </span>
          </span>
        </label>
      ) : null}

      <section
        className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
        data-testid="trip-chi-paga"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-slate-900">Chi paga</h3>
        </div>

        {participants.length > 0 ? (
          <ul className="space-y-1" data-testid="trip-chi-paga-status">
            {participants.map((p) => {
              const cov = coverageForUser(coverage, p.userId);
              const ui = participantFlightUiStatus({
                userId: p.userId,
                selfBooked: p.flightsBought && unbookedLegs.length === 0,
                coverage: cov,
                coveredByName: cov
                  ? nameById.get(cov.coveredByUserId) ?? null
                  : null,
              });
              return (
                <li
                  key={p.userId}
                  className="flex items-center justify-between gap-2 px-0.5 py-0.5 text-[11px]"
                >
                  <span className="truncate font-medium text-slate-700">
                    {p.isSelf ? 'Io' : p.name}
                    {p.isOwner ? (
                      <span className="ml-1 font-normal text-slate-400">· creatore</span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'shrink-0',
                      ui.kind === 'booked' || ui.kind === 'covered'
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    )}
                  >
                    {ui.kind === 'covered'
                      ? `Pagato da ${ui.byName}`
                      : unbookedLegs.length > 0 && (p.flightsBought || bookings.length > 0) && p.isSelf
                        ? `${bookings.length} tratta/e · resta da prenotare`
                        : coverageStatusLabelIt(ui)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!canPay ? (
          <p className="text-xs text-emerald-800" data-testid="trip-voli-all-booked">
            Tutte le tratte selezionate risultano prenotate.
          </p>
        ) : !payOthersOpen ? (
          <div className="space-y-2" data-testid="trip-chi-paga-choices">
            {!separateLegs ? (
              <Button
                type="button"
                className="min-h-11 w-full rounded-full"
                onClick={() => goCheckoutAll([currentUserId])}
                disabled={isPersonFullyCovered(currentUserId)}
                data-testid="trip-pago-per-me"
              >
                Pago per me
                {unbookedPerPerson != null ? (
                  <span className="ml-1 font-semibold opacity-90">
                    · {formatEuro(unbookedPerPerson)}
                  </span>
                ) : null}
              </Button>
            ) : (
              <p className="text-[11px] text-slate-500" data-testid="trip-voli-separate-hint">
                Usa Prenota su ogni tratta qui sopra, oppure Pago per altri per includere più
                persone su una tratta.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full rounded-full"
              onClick={openPayOthers}
              data-testid="trip-pago-per-altri"
            >
              Pago per altri
            </Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="trip-pago-per-altri-panel">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500">
                Spunta chi include nel checkout (puoi togliere te stesso).
              </p>
              <button
                type="button"
                className="text-[11px] font-semibold text-primary"
                onClick={() => setPayOthersOpen(false)}
                data-testid="trip-pago-per-altri-chiudi"
              >
                Chiudi
              </button>
            </div>
            <ul className="space-y-1.5">
              {participants.map((p) => {
                const locked = isPersonFullyCovered(p.userId);
                const cov = coverageForUser(coverage, p.userId);
                const ui = participantFlightUiStatus({
                  userId: p.userId,
                  selfBooked: p.flightsBought && unbookedLegs.length === 0,
                  coverage: cov,
                  coveredByName: cov
                    ? nameById.get(cov.coveredByUserId) ?? null
                    : null,
                });
                const checked = selectedPayIds.includes(p.userId);
                return (
                  <li
                    key={p.userId}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border bg-white px-3 py-2',
                      locked ? 'border-emerald-200/70 opacity-80' : 'border-slate-200'
                    )}
                  >
                    <button
                      type="button"
                      disabled={locked}
                      aria-pressed={checked}
                      onClick={() => togglePay(p.userId)}
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                        checked
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-300 bg-white',
                        locked && 'cursor-not-allowed'
                      )}
                      data-testid={`trip-pay-toggle-${p.userId}`}
                    >
                      {checked && !locked ? <Check className="h-3 w-3" /> : null}
                      {locked ? <Check className="h-3 w-3 opacity-40" /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {p.isSelf ? 'Io' : p.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {ui.kind === 'covered'
                          ? `Pagato da ${ui.byName}`
                          : coverageStatusLabelIt(ui)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-2 px-0.5 text-xs text-slate-600">
              <span>
                {selectedPayIds.length}{' '}
                {selectedPayIds.length === 1 ? 'persona' : 'persone'}
                {separateLegs ? ' · scegli la tratta sotto' : ''}
              </span>
              <span className="font-bold tabular-nums text-slate-900">
                {!separateLegs && unbookedPerPerson != null
                  ? formatEuro(unbookedPerPerson * Math.max(0, selectedPayIds.length))
                  : perPersonTotal != null && !separateLegs
                    ? formatEuro(perPersonTotal * Math.max(0, selectedPayIds.length))
                    : '—'}
              </span>
            </div>
            {!separateLegs ? (
              <Button
                type="button"
                className="min-h-11 w-full rounded-full"
                disabled={selectedPayIds.length === 0}
                onClick={() => goCheckoutAll(selectedPayIds)}
                data-testid="trip-voli-checkout-altri"
              >
                {selectedPayIds.length <= 1
                  ? selectedPayIds[0] === currentUserId
                    ? `Prenota ${unbookedLegs.length} tratt${unbookedLegs.length === 1 ? 'a' : 'e'}`
                    : 'Prenota per 1 persona'
                  : `Prenota ${unbookedLegs.length} tratte · ${selectedPayIds.length} persone`}
              </Button>
            ) : (
              <ul className="space-y-2" data-testid="trip-voli-separate-altri">
                {unbookedLegs.map((leg) => (
                  <li key={leg.id}>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 w-full rounded-full"
                      disabled={selectedPayIds.length === 0}
                      onClick={() => goCheckoutOne(selectedPayIds, leg)}
                      data-testid={`trip-voli-checkout-leg-${leg.id}`}
                    >
                      Prenota {leg.originIata}→{leg.destinationIata}
                      {leg.price != null
                        ? ` · ${formatEuro(leg.price * Math.max(1, selectedPayIds.length))}`
                        : ''}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {plan ? (
        <EditSelectedFlightLegModal
          open={Boolean(editLegId) || picking}
          onOpenChange={(o) => {
            if (!o) {
              setEditLegId(null);
              setPicking(false);
            } else if (!editLegId && plan.legs[0]) {
              setEditLegId(plan.legs[0].id);
            }
          }}
          practiceId={practice.id}
          plan={plan}
          legId={editLegId ?? plan.legs[0]?.id ?? null}
          onSaved={(next) => {
            setPlan(next);
            savePracticeFlightsLocal(practice.id, next);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/** Empty-plan chooser: seed a minimal leg from practice dates/hubs then open editor. */
export function seedEmptyFlightPlan(practice: PracticeRow): SelectedFlightPlanSnapshot {
  const origin = 'MXP';
  const dest = practice.destination_iata || 'KEF';
  return {
    version: 1,
    travelers: 1,
    returnHome: true,
    savedAt: new Date().toISOString(),
    legs: [
      {
        id: `outbound-${origin}-${dest}`,
        kind: 'outbound',
        originIata: origin,
        destinationIata: dest,
        date: String(practice.date_from).slice(0, 10),
        labelIt: `${origin} → ${dest}`,
        offerId: null,
        price: null,
        currency: null,
        stops: null,
        durationMinutes: null,
        airline: null,
        departureAt: null,
        arrivalAt: null,
      },
      {
        id: `return-${dest}-${origin}`,
        kind: 'return',
        originIata: dest,
        destinationIata: origin,
        date: String(practice.date_to).slice(0, 10),
        labelIt: `${dest} → ${origin}`,
        offerId: null,
        price: null,
        currency: null,
        stops: null,
        durationMinutes: null,
        airline: null,
        departureAt: null,
        arrivalAt: null,
      },
    ],
  };
}
