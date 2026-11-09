'use client';

import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { formatEuro } from '@/lib/format/euro';
import { kindLabelIt } from '@/lib/itineraries/budget/compute';
import type { MultiCountryPlan } from '@/lib/itineraries/multi-country/types';
import { tripDurationLabelIt } from '@/lib/itineraries/trip-duration';
import { cn } from '@/lib/utils';

export function MultiCountryBudgetCard({
  plan,
  className,
}: {
  plan: MultiCountryPlan;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-2xl bg-[var(--color-tint)] px-4 py-4 space-y-3', className)}
      data-testid="multi-country-budget"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {COMPLIANCE_COPY.budgetLabel} · multi-paese
        </p>
        <p className="mt-1 text-lg font-extrabold text-[var(--color-text)]">
          {plan.totalPerPersonEur != null
            ? formatEuro(plan.totalPerPersonEur, { approx: false })
            : 'da verificare'}{' '}
          <span className="text-sm font-semibold">a persona</span>
          <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
            {' '}
            · {tripDurationLabelIt(plan.tripDays)}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          Arrivo {plan.arrivalIata} · rientro da {plan.departureIata}.{' '}
          {COMPLIANCE_COPY.priceIsSumOfServices}
        </p>
        {plan.unverifiedCombination && plan.unverifiedNoticeIt ? (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {plan.unverifiedNoticeIt}
          </p>
        ) : null}
      </header>

      <ul className="space-y-2 border-t border-[var(--color-border)]/70 pt-3 text-sm">
        <li className="flex justify-between gap-3">
          <span>
            Voli open-jaw{' '}
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
              {plan.openJawFlightKind === 'unknown'
                ? 'da verificare'
                : kindLabelIt(plan.openJawFlightKind)}
            </span>
          </span>
          <span className="font-semibold tabular-nums">
            {plan.openJawFlightEurPerPerson != null
              ? formatEuro(plan.openJawFlightEurPerPerson, { approx: false })
              : 'da verificare'}
          </span>
        </li>
        <li className="text-[11px] text-[var(--color-text-secondary)] -mt-1">
          {plan.openJawFlightDetailIt}
        </li>
        {plan.countryBudgets.map((c) => (
          <li key={c.slug} className="flex justify-between gap-3">
            <span>
              {c.nameIt} (in loco){' '}
              <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                stima
              </span>
            </span>
            <span className="font-semibold tabular-nums">
              {c.breakdown.perPersonEur != null
                ? formatEuro(c.breakdown.perPersonEur, { approx: false })
                : 'da verificare'}
            </span>
          </li>
        ))}
        <li className="flex justify-between gap-3">
          <span>
            Trasferimento tra paesi{' '}
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">
              {plan.transferCostKind === 'unknown' ? 'da verificare' : 'stima'}
            </span>
          </span>
          <span className="font-semibold tabular-nums">
            {plan.transfer.costEurPerPerson != null
              ? formatEuro(plan.transfer.costEurPerPerson, { approx: false })
              : 'da verificare'}
          </span>
        </li>
      </ul>

      <p className="text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
        {plan.visaNoticeIt}{' '}
        <a
          href={plan.visaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          viaggiaresicuri.it
        </a>
      </p>
    </section>
  );
}
