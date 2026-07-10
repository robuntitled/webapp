'use client';

import { Button } from '@/components/ui/button';
import { estimateTripBudget } from '@/lib/composer/days';
import type { ComposerDraft } from '@/types/composer';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListOrdered,
  Map as MapIcon,
  MapPin,
} from 'lucide-react';

export type PlanViewMode = 'split' | 'plan' | 'map';

type ComposerPlanToolbarProps = {
  draft: ComposerDraft;
  viewMode: PlanViewMode;
  totalBlocks: number;
  onBack: () => void;
  onReview: () => void;
  onViewChange: (mode: PlanViewMode) => void;
};

const VIEW_MODES = [
  { id: 'split' as const, label: 'Split', icon: LayoutGrid, hideMobile: true },
  { id: 'plan' as const, label: 'Piano', icon: ListOrdered },
  { id: 'map' as const, label: 'Mappa', icon: MapIcon },
];

export function ComposerPlanToolbar({
  draft,
  viewMode,
  totalBlocks,
  onBack,
  onReview,
  onViewChange,
}: ComposerPlanToolbarProps) {
  const budget = estimateTripBudget(draft.days);
  const destLabel = draft.destinationMeta?.label ?? draft.destination;

  return (
    <div className="sticky top-16 z-30 composer-plan-toolbar border-b border-white/8">
      <div className="container mx-auto px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="rounded-full text-white/70 hover:text-white hover:bg-white/10 shrink-0 h-9"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Meta</span>
          </Button>

          <div className="flex-1 min-w-0 flex items-center gap-2 justify-center">
            <div className="hidden sm:flex items-center gap-2">
              <span className="h-1.5 w-6 rounded-full bg-accent/60" />
              <span className="h-1.5 w-8 rounded-full bg-accent" />
              <span className="h-1.5 w-4 rounded-full bg-white/15" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 sm:ml-2">
              Step 2 · Componi
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            className="rounded-full shrink-0 shadow-lg shadow-accent/20 font-semibold"
            onClick={onReview}
            disabled={totalBlocks === 0}
          >
            <span className="hidden sm:inline">Rivedi</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15">
              <MapPin className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{destLabel}</p>
              <p className="text-[10px] text-white/40">
                {draft.days.length} giorni · {totalBlocks} blocchi · ~{budget}€/persona
              </p>
            </div>
          </div>

          <div className="composer-view-toggle flex rounded-full p-0.5 gap-0.5">
            {VIEW_MODES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onViewChange(v.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  v.hideMobile ? 'hidden lg:flex' : 'flex'
                } ${
                  viewMode === v.id
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}