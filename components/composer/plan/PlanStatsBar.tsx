'use client';

import { getBudgetBreakdown, getPlanCompletion } from '@/lib/composer/planning';
import type { ComposerDay } from '@/types/composer';
import { Euro, Layers, MapPinned, Plane } from 'lucide-react';

type PlanStatsBarProps = {
  days: ComposerDay[];
};

export function PlanStatsBar({ days }: PlanStatsBarProps) {
  const { percent, filledDays, totalDays, totalBlocks } = getPlanCompletion(days);
  const budget = getBudgetBreakdown(days);
  const hasFlights = days.some((d) => d.blocks.some((b) => b.type === 'flight'));
  const hasHotels = days.some((d) => d.blocks.some((b) => b.type === 'hotel'));

  const stats = [
    {
      icon: Euro,
      label: 'Budget orientativo',
      value: budget.total > 0 ? `${budget.total}€` : '—',
      sub: 'per persona',
      accent: true,
    },
    {
      icon: Layers,
      label: 'Completamento',
      value: `${percent}%`,
      sub: `${filledDays}/${totalDays} giorni`,
    },
    {
      icon: MapPinned,
      label: 'Tappe',
      value: String(totalBlocks),
      sub: 'blocchi totali',
    },
    {
      icon: Plane,
      label: 'Prenotazioni',
      value: hasFlights && hasHotels ? 'Volo+Hotel' : hasFlights ? 'Volo' : hasHotels ? 'Hotel' : '—',
      sub: 'da confermare',
    },
  ];

  return (
    <div className="composer-stats-bar grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`composer-stat-card rounded-2xl p-4 ${stat.accent ? 'composer-stat-card-accent' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`h-4 w-4 ${stat.accent ? 'text-accent' : 'text-white/40'}`} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              {stat.label}
            </span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${stat.accent ? 'text-accent' : 'text-white'}`}>
            {stat.value}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}