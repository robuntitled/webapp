'use client';

import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { formatEuro } from '@/lib/format/euro';
import {
  kindLabelIt,
  type ComputeBudgetInput,
  computeItineraryBudget,
} from '@/lib/itineraries/budget/compute';
import type { BudgetBreakdown } from '@/lib/itineraries/budget/types';
import { tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export type BudgetBreakdownCardProps = ComputeBudgetInput & {
  className?: string;
  /** Precomputed breakdown (optional; else computed client-side). */
  breakdown?: BudgetBreakdown | null;
};

export function BudgetBreakdownCard({
  className,
  breakdown: breakdownProp,
  ...input
}: BudgetBreakdownCardProps) {
  const breakdown = useMemo(
    () => breakdownProp ?? computeItineraryBudget(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when trip levers change
    [
      breakdownProp,
      input.destinationSlug,
      input.tripDays,
      input.vibe,
      input.company,
      input.party?.travelers,
      input.party?.rooms,
      input.liveFlightEurPerPerson,
      input.days,
    ]
  );

  if (!breakdown || breakdown.totalEur == null) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950',
          className
        )}
      >
        Budget orientativo: da verificare per questa meta.
      </div>
    );
  }

  const cats = [
    breakdown.byCategory.flights,
    breakdown.byCategory.hotels,
    breakdown.byCategory.internal_transfers,
    breakdown.byCategory.daily_living,
    breakdown.byCategory.activities,
  ];

  return (
    <section
      className={cn(
        'rounded-2xl bg-[var(--color-tint)] px-4 py-4 space-y-3',
        className
      )}
      data-testid="budget-breakdown"
    >
      <header className="sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {COMPLIANCE_COPY.budgetLabel}
          </p>
          <p className="mt-1 text-lg font-extrabold text-[var(--color-text)]">
            {formatEuro(breakdown.perPersonEur ?? breakdown.totalEur, { approx: false })}{' '}
            <span className="text-sm font-semibold">a persona</span>
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
              {' '}
              · {tripDurationLabelIt(breakdown.tripDays)}
            </span>
          </p>
          {breakdown.travelers > 1 ? (
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Totale gruppo ({breakdown.travelers} persone, {breakdown.rooms} camera/e):{' '}
              {formatEuro(breakdown.totalEur, { approx: false })}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Totale stimato: {formatEuro(breakdown.totalEur, { approx: false })}
            </p>
          )}
        </div>
        <p className="mt-2 max-w-xs text-xs text-[var(--color-text-secondary)] sm:mt-0 sm:text-right">
          {COMPLIANCE_COPY.priceIsSumOfServices}
        </p>
      </header>

      <ul className="space-y-1.5 border-t border-[var(--color-border)]/70 pt-3">
        {cats.map((c) => (
          <li
            key={c.labelIt}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-[var(--color-text)]">
              {c.labelIt}{' '}
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                {kindLabelIt(c.kind)}
              </span>
            </span>
            <span className="font-semibold tabular-nums text-[var(--color-text)]">
              {c.amountEur == null
                ? 'da verificare'
                : formatEuro(Math.round(c.amountEur / breakdown.travelers), {
                    approx: false,
                  })}
            </span>
          </li>
        ))}
      </ul>

      {breakdown.sources.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
          Fonti stima:{' '}
          {breakdown.sources
            .slice(0, 3)
            .map((s) => `${s.labelIt} (${s.retrievedOn})`)
            .join(' · ')}
          {breakdown.hasUnknown ? ' · alcune voci da verificare' : null}
        </p>
      ) : null}
    </section>
  );
}
