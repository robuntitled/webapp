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
  formatClockIt,
  formatDurationIt,
  formatLegDateIt,
  formatStopsIt,
} from '@/lib/itineraries/selected-flight-display';
import {
  loadPracticeFlightsLocal,
  parseSelectedFlightPlan,
  primaryOfferFromSelected,
  savePracticeFlightsLocal,
  snapshotFromPlannedLegs,
  type SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';
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
  const [selectedPayIds, setSelectedPayIds] = useState<string[]>(() => [currentUserId]);

  const coverage = useMemo(
    () =>
      parseFlightBookingCoverage(
        (practice as { flight_booking_coverage?: unknown }).flight_booking_coverage
      ),
    [practice]
  );

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

  function togglePay(userId: string) {
    const cov = coverageForUser(coverage, userId);
    if (cov && (cov.status === 'booked' || cov.status === 'covered')) return;
    if (userId === currentUserId) return; // self always included when booking
    setSelectedPayIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function goCheckout() {
    const offer = primaryOfferFromSelected(plan);
    if (!offer?.offerId || offer.price == null) {
      toast.error('Seleziona i voli prima di prenotare.');
      return;
    }
    const adults = Math.max(1, selectedPayIds.length);
    saveFlightCheckoutDraft({
      offerId: offer.offerId,
      price: offer.price * adults,
      currency: offer.currency ?? 'EUR',
      adults,
      tripType: 'oneway',
      practiceId: practice.id,
      createdAt: Date.now(),
      outbound: {
        origin: offer.originIata,
        destination: offer.destinationIata,
        airline: offer.airline,
        departureAt: offer.departureAt,
        arrivalAt: offer.arrivalAt,
        durationMinutes: offer.durationMinutes,
        stops: offer.stops ?? undefined,
      },
      returnLeg: null,
    });
    // Stash who we intend to cover (client-side until migration 049 is applied).
    try {
      sessionStorage.setItem(
        `nl-flight-coverage-intent-${practice.id}`,
        JSON.stringify({
          bookerUserId: currentUserId,
          beneficiaryIds: selectedPayIds,
        })
      );
    } catch {
      /* ignore */
    }
    router.push('/prenota/voli/checkout');
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

  return (
    <div className="space-y-5" data-testid="trip-voli-fixed">
      <ul className="space-y-2.5">
        {plan.legs.map((leg) => (
          <li
            key={leg.id}
            className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
            data-testid={`trip-voli-leg-${leg.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {leg.kind === 'return' || leg.kind === 'openjaw_return'
                    ? 'Rientro'
                    : leg.kind === 'intercountry'
                      ? 'Tra paesi'
                      : 'Tratta'}
                </p>
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
                {canEdit ? (
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
              </div>
            </div>
          </li>
        ))}
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

      {participants.length > 0 ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-slate-900">Chi paga</h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Prenota solo per te, oppure spunta altri partecipanti e paga i loro posti con gli
            stessi voli in un unico checkout.
          </p>
          <ul className="space-y-2">
            {participants.map((p) => {
              const cov = coverageForUser(coverage, p.userId);
              const ui = participantFlightUiStatus({
                userId: p.userId,
                selfBooked: p.flightsBought,
                coverage: cov,
                coveredByName: cov
                  ? nameById.get(cov.coveredByUserId) ?? null
                  : null,
              });
              const locked = ui.kind === 'booked' || ui.kind === 'covered';
              const checked = selectedPayIds.includes(p.userId) || p.userId === currentUserId;
              return (
                <li
                  key={p.userId}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5',
                    locked ? 'border-emerald-200/80' : 'border-slate-200'
                  )}
                >
                  <button
                    type="button"
                    disabled={locked || p.userId === currentUserId}
                    aria-pressed={checked}
                    onClick={() => togglePay(p.userId)}
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      checked
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white',
                      (locked || p.userId === currentUserId) && 'opacity-80'
                    )}
                    data-testid={`trip-pay-toggle-${p.userId}`}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {p.isSelf ? 'Io' : p.name}
                      {p.isOwner ? (
                        <span className="ml-1 text-[10px] font-medium text-slate-400">
                          · creatore
                        </span>
                      ) : null}
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
          <Button
            type="button"
            className="min-h-11 w-full rounded-full"
            onClick={goCheckout}
            data-testid="trip-voli-checkout"
          >
            {selectedPayIds.length <= 1
              ? 'Prenota il mio posto'
              : `Prenota per ${selectedPayIds.length} persone`}
          </Button>
        </section>
      ) : (
        <Button
          type="button"
          className="min-h-11 w-full rounded-full"
          onClick={goCheckout}
          data-testid="trip-voli-checkout"
        >
          Prenota i voli
        </Button>
      )}

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
