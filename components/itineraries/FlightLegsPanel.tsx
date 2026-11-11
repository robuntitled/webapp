'use client';

import { useState } from 'react';
import { Pencil, Plane, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatEuro } from '@/lib/format/euro';
import {
  SEPARATE_TICKETS_NOTICE_IT,
  STALE_OFFER_NOTICE_IT,
  analyzeLegTiming,
  clearLegOffer,
  removeLeg,
  updateLegFields,
  type TripFlightLeg,
  type TripFlightPlan,
} from '@/lib/travel/trip-flight-legs';
import { cn } from '@/lib/utils';

type Props = {
  plan: TripFlightPlan;
  onChange: (plan: TripFlightPlan) => void;
  onEditLeg?: (leg: TripFlightLeg) => void;
  className?: string;
  /** Compact mode for itinerario domestic list */
  compact?: boolean;
};

function formatDateIt(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function SeparateTicketsNotice({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('text-[11px] text-[var(--color-text-secondary)]', className)}>
      <p className="inline">
        <Plane className="mr-1 inline h-3 w-3 text-primary" aria-hidden />
        Biglietti indipendenti per tratta.{' '}
        <button
          type="button"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-2 hover:underline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Nascondi' : 'Dettagli'}
        </button>
      </p>
      {open ? (
        <p className="mt-1.5 leading-relaxed">{SEPARATE_TICKETS_NOTICE_IT}</p>
      ) : null}
    </div>
  );
}

export function FlightLegsPanel({
  plan,
  onChange,
  onEditLeg,
  className,
  compact = false,
}: Props) {
  const timing = analyzeLegTiming(plan.legs);

  return (
    <div className={cn('space-y-3', className)} data-testid="flight-legs-panel">
      {!compact ? (
        <h3 className="font-display text-lg font-extrabold">Tratte</h3>
      ) : null}

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
                  <p className="text-sm font-bold">
                    {leg.kind === 'intercountry' ? (
                      <span className="mr-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Tra paesi
                      </span>
                    ) : null}
                    {leg.kind === 'domestic' || leg.kind === 'internal' ? (
                      <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        Domestico
                      </span>
                    ) : null}
                    {leg.labelIt}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatDateIt(leg.date)} · {leg.originIata} → {leg.destinationIata}
                  </p>
                  {leg.offer && (leg.status === 'selected' || leg.status === 'stale') ? (
                    <p className="text-xs font-semibold">
                      {formatEuro(leg.offer.price, { approx: false }) ??
                        `${leg.offer.price} ${leg.offer.currency}`}
                      {leg.status === 'stale' ? (
                        <span className="ml-1 text-amber-800">· da ricontrollare</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {leg.status === 'estimated'
                        ? 'Stima — scegli un volo reale'
                        : 'Nessun volo selezionato'}
                    </p>
                  )}
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
                  {onEditLeg ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg px-2 text-[11px]"
                      onClick={() => onEditLeg(leg)}
                    >
                      <Pencil className="h-3 w-3" />
                      Modifica
                    </Button>
                  ) : null}
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

      {plan.legs.some((l) => l.status === 'stale') ? (
        <p className="text-[11px] text-amber-900">{STALE_OFFER_NOTICE_IT}</p>
      ) : null}
    </div>
  );
}
