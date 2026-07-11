'use client';

import { estimateDayBudget, getBudgetBreakdown } from '@/lib/composer/planning';
import type { ComposerDay } from '@/types/composer';
import { PieChart } from 'lucide-react';

type BudgetPanelProps = {
  days: ComposerDay[];
  activeDayIndex: number;
};

export function BudgetPanel({ days, activeDayIndex }: BudgetPanelProps) {
  const breakdown = getBudgetBreakdown(days);
  const activeDay = days.find((d) => d.dayIndex === activeDayIndex);
  const dayBudget = activeDay ? estimateDayBudget(activeDay) : 0;

  const rows = [
    { label: 'Voli', value: breakdown.flights, color: 'bg-sky-500' },
    { label: 'Hotel', value: breakdown.hotels, color: 'bg-violet-500' },
    { label: 'Esperienze', value: breakdown.experiences, color: 'bg-emerald-500' },
    { label: 'Altro', value: breakdown.other, color: 'bg-amber-500' },
  ].filter((r) => r.value > 0);

  const max = breakdown.total || 1;

  return (
    <div className="composer-budget-panel rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <PieChart className="h-4 w-4 text-accent" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Budget viaggio
        </p>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-white tabular-nums">
            {breakdown.total > 0 ? `${breakdown.total}€` : '—'}
          </p>
          <p className="text-[10px] text-white/35">stima totale / persona</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-accent tabular-nums">
            {dayBudget > 0 ? `${dayBudget}€` : '—'}
          </p>
          <p className="text-[10px] text-white/35">giorno {activeDayIndex}</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/55">{row.label}</span>
                <span className="text-white/80 font-medium tabular-nums">{row.value}€</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.color} transition-all duration-500`}
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/35 leading-relaxed">
          Aggiungi voli, hotel e attività con prezzo per vedere il breakdown.
        </p>
      )}
    </div>
  );
}