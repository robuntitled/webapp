'use client';

import { useState } from 'react';
import { ArrowDownUp, Pencil, Plane, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatEuro } from '@/lib/format/euro';
import {
  SEPARATE_TICKETS_NOTICE_IT,
  STALE_OFFER_NOTICE_IT,
  analyzeLegTiming,
  clearLegOffer,
  providerSearchModeForPlan,
  removeLeg,
  reorderLegs,
  selectedLegsTotal,
  updateLegFields,
  type TripFlightLeg,
  type TripFlightPlan,
} from '@/lib/travel/trip-flight-legs';
import { cn } from '@/lib/utils';

type Props = {
  plan: TripFlightPlan;
  onChange: (plan: TripFlightPlan) => void;
  onEditLeg: (leg: TripFlightLeg) => void;
  className?: string;
};

function formatDateIt(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function FlightLegsPanel({ plan, onChange, onEditLeg, className }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const totals = selectedLegsTotal(plan);
  const timing = analyzeLegTiming(plan.legs);
  const mode = providerSearchModeForPlan(plan);

  return (
    <div className={cn('space-y-3', className)} data-testid="flight-legs-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-extrabold">Tratte del viaggio</h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{mode.reasonIt}</p>
        </div>
        {totals.amount != null ? (
          <p className="text-sm font-extrabold tabular-nums">
            {formatEuro(totals.amount, { approx: false }) ?? `${totals.amount} €`}{' '}
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              · {totals.selectedCount} tratte
            </span>
          </p>
        ) : null}
      </div>

      <ul className="space-y-2">
        {plan.legs.map((leg, index) => {
          const issue = timing.find((t) => t.legId === leg.id);
          return (
            <li
              key={leg.id}
              className={cn(
                'rounded-2xl border px-3 py-3',
                leg.status === 'stale'
                  ? 'border-amber-300 bg-amber-50/60'
                  : leg.status === 'selected'
                    ? 'border-primary/40 bg-white'
                    : 'border-[var(--color-border)] bg-white'
              )}
              data-testid={`flight-leg-${leg.id}`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-tint)] text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-bold">{leg.labelIt}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatDateIt(leg.date)} · {leg.passengers} pax ·{' '}
                    {leg.originIata} → {leg.destinationIata}
                  </p>
                  {leg.offer && (leg.status === 'selected' || leg.status === 'stale') ? (
                    <p className="text-xs font-semibold">
                      {formatEuro(leg.offer.price, { approx: false }) ??
                        `${leg.offer.price} ${leg.offer.currency}`}{' '}
                      · {leg.offer.stops === 0 ? 'diretto' : `${leg.offer.stops} scali`} ·{' '}
                      {Math.round(leg.offer.durationMinutes / 60)} h
                      {leg.status === 'stale' ? (
                        <span className="ml-1 text-amber-800">· da ricontrollare</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {leg.status === 'estimated'
                        ? 'Stima itinerario — scegli un volo reale'
                        : 'Nessun volo selezionato'}
                    </p>
                  )}
                  {leg.notesIt ? (
                    <p className="text-[11px] text-[var(--color-text-secondary)]">{leg.notesIt}</p>
                  ) : null}
                  {issue ? (
                    <p
                      className={cn(
                        'text-[11px] font-medium',
                        issue.severity === 'block' ? 'text-red-700' : 'text-amber-800'
                      )}
                    >
                      {issue.messageIt}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg px-2 text-[11px]"
                    onClick={() => onEditLeg(leg)}
                  >
                    <Pencil className="h-3 w-3" />
                    Modifica volo
                  </Button>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--color-border)] p-1.5 disabled:opacity-40"
                      disabled={index === 0}
                      aria-label="Sposta su"
                      onClick={() => onChange(reorderLegs(plan, index, index - 1))}
                    >
                      <ArrowDownUp className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--color-border)] p-1.5 disabled:opacity-40"
                      disabled={index >= plan.legs.length - 1}
                      aria-label="Sposta giù"
                      onClick={() => onChange(reorderLegs(plan, index, index + 1))}
                    >
                      <ArrowDownUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--color-border)] p-1.5 text-red-700"
                      aria-label="Rimuovi tratta"
                      onClick={() => onChange(removeLeg(plan, leg.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="text-[10px] font-semibold">
                  Da
                  <input
                    className="mt-0.5 w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs uppercase"
                    value={leg.originIata}
                    maxLength={3}
                    onChange={(e) =>
                      onChange(
                        updateLegFields(plan, leg.id, {
                          originIata: e.target.value.toUpperCase(),
                        })
                      )
                    }
                  />
                </label>
                <label className="text-[10px] font-semibold">
                  A
                  <input
                    className="mt-0.5 w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs uppercase"
                    value={leg.destinationIata}
                    maxLength={3}
                    onChange={(e) =>
                      onChange(
                        updateLegFields(plan, leg.id, {
                          destinationIata: e.target.value.toUpperCase(),
                        })
                      )
                    }
                  />
                </label>
                <label className="text-[10px] font-semibold">
                  Data
                  <input
                    type="date"
                    lang="it-IT"
                    className="mt-0.5 w-full rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs"
                    value={leg.date}
                    onChange={(e) =>
                      onChange(updateLegFields(plan, leg.id, { date: e.target.value }))
                    }
                  />
                </label>
              </div>
              {leg.offer && leg.status === 'stale' ? (
                <button
                  type="button"
                  className="mt-2 text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={() => onChange(clearLegOffer(plan, leg.id))}
                >
                  Rimuovi tariffa non più valida
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {totals.staleCount > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {STALE_OFFER_NOTICE_IT}
        </p>
      ) : null}

      <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-tint)]/50 px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
        <Plane className="mr-1 inline h-3.5 w-3.5" />
        {SEPARATE_TICKETS_NOTICE_IT}
      </p>

      <Button
        type="button"
        variant="outline"
        className="min-h-10 w-full rounded-[10px]"
        onClick={() => setShowAdd((v) => !v)}
      >
        <Plus className="h-4 w-4" />
        Aggiungi tratta
      </Button>
      {showAdd ? (
        <AddLegForm
          onAdd={(leg) => {
            onChange({
              ...plan,
              shape: 'multi_oneway',
              legs: [
                ...plan.legs,
                {
                  ...leg,
                  id: `custom-${Date.now()}`,
                  offer: null,
                  status: 'empty',
                },
              ],
            });
            setShowAdd(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AddLegForm({
  onAdd,
}: {
  onAdd: (leg: Omit<TripFlightLeg, 'id' | 'offer' | 'status'>) => void;
}) {
  const [origin, setOrigin] = useState('MXP');
  const [dest, setDest] = useState('BKK');
  const [date, setDate] = useState('');
  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-[var(--color-border)] p-3">
      <p className="text-xs font-bold">Nuova tratta (one-way)</p>
      <div className="grid grid-cols-3 gap-2">
        <input
          className="rounded-lg border px-2 py-1.5 text-xs uppercase"
          value={origin}
          maxLength={3}
          onChange={(e) => setOrigin(e.target.value.toUpperCase())}
          placeholder="Da"
        />
        <input
          className="rounded-lg border px-2 py-1.5 text-xs uppercase"
          value={dest}
          maxLength={3}
          onChange={(e) => setDest(e.target.value.toUpperCase())}
          placeholder="A"
        />
        <input
          type="date"
          lang="it-IT"
          className="rounded-lg border px-2 py-1.5 text-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Button
        type="button"
        size="sm"
        className="rounded-lg"
        disabled={origin.length !== 3 || dest.length !== 3 || !date}
        onClick={() =>
          onAdd({
            kind: 'custom',
            originIata: origin,
            destinationIata: dest,
            date,
            passengers: 1,
            labelIt: `${origin} → ${dest}`,
            notesIt: 'Tratta aggiunta manualmente.',
          })
        }
      >
        Conferma tratta
      </Button>
    </div>
  );
}
