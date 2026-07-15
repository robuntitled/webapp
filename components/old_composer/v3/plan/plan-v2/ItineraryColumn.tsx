'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DayTracker, type DayTrackerSelection } from '@/components/composer/plan-v2/DayTracker';
import { DayTimeline } from '@/components/composer/plan-v2/DayTimeline';
import { NextDayCta } from '@/components/composer/plan-v2/NextDayCta';
import { FullTripMapsCta } from '@/components/composer/plan-v2/FullTripMapsCta';
import { DayNotesField } from '@/components/composer/plan/DayNotesField';
import { formatComposerDayLabel } from '@/lib/composer/days';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { ComposerBlock, ComposerDay, ComposerDraft } from '@/types/composer';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

type ItineraryColumnProps = {
  draft: ComposerDraft;
  selection: DayTrackerSelection;
  activeDay: ComposerDay | null;
  highlightedPinId: string | null;
  mapMode: MapViewMode;
  hasNextDay: boolean;
  onSelect: (selection: DayTrackerSelection) => void;
  onAddDay: () => void;
  onRemoveDay: (dayIndex: number) => void;
  onNextDay: () => void;
  onToggleFullTrip: () => void;
  onUpdateDayTitle: (title: string) => void;
  onUpdateDayNotes: (notes: string) => void;
  onAddActivity: () => void;
  onEditBlock: (block: ComposerBlock) => void;
  onRemoveBlock: (blockId: string) => void;
  onHoverBlock: (blockId: string | null) => void;
  onBack: () => void;
  onReview: () => void;
  canReview: boolean;
};

export function ItineraryColumn({
  draft,
  selection,
  activeDay,
  highlightedPinId,
  mapMode,
  hasNextDay,
  onSelect,
  onAddDay,
  onRemoveDay,
  onNextDay,
  onToggleFullTrip,
  onUpdateDayTitle,
  onUpdateDayNotes,
  onAddActivity,
  onEditBlock,
  onRemoveBlock,
  onHoverBlock,
  onBack,
  onReview,
  canReview,
}: ItineraryColumnProps) {
  const isOverview = selection === 'overview';

  return (
    <section className="plan-v2-itinerary flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-4 border-b border-slate-200/80 px-5 py-4 md:px-7">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-9 rounded-full text-slate-600 hover:bg-white hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Meta</span>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Itinerario
            </p>
            <p className="truncate text-sm font-medium text-slate-700">
              {draft.destinationMeta?.label ?? draft.destination}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onReview}
            disabled={!canReview}
            className="h-9 rounded-full bg-sky-600 font-semibold shadow-sm hover:bg-sky-700"
          >
            <span className="hidden sm:inline">Rivedi</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>

        <DayTracker
          days={draft.days}
          selection={selection}
          onSelect={onSelect}
          onAddDay={onAddDay}
          onRemoveDay={onRemoveDay}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7 composer-scroll">
        <AnimatePresence mode="wait">
          {isOverview ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-3"
            >
              <h2 className="font-display text-2xl font-semibold text-slate-900">
                Overview viaggio
              </h2>
              <p className="text-sm text-slate-500">
                Seleziona un giorno per pianificare, oppure mostra il percorso completo sulla
                mappa.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {draft.days.map((day) => (
                  <button
                    key={day.dayIndex}
                    type="button"
                    onClick={() => onSelect(day.dayIndex)}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      Giorno {day.dayIndex}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatComposerDayLabel(day.date, day.dayIndex)}
                    </p>
                    <p className="mt-3 text-xs font-medium text-sky-600">
                      {day.blocks.length} {day.blocks.length === 1 ? 'tappa' : 'tappe'}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : activeDay ? (
            <motion.div
              key={activeDay.dayIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex min-h-full flex-col gap-5"
            >
              <div className="space-y-2">
                <Input
                  value={activeDay.title}
                  onChange={(e) => onUpdateDayTitle(e.target.value)}
                  placeholder="Titolo della giornata…"
                  className="h-auto border-0 bg-transparent px-0 font-display text-2xl font-semibold text-slate-900 shadow-none focus-visible:ring-0"
                />
                <p className="text-xs text-slate-500">
                  {formatComposerDayLabel(activeDay.date, activeDay.dayIndex)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={onAddActivity}
                  className="h-10 rounded-xl bg-sky-600 font-semibold shadow-sm hover:bg-sky-700"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Aggiungi attività
                </Button>
              </div>

              <DayTimeline
                blocks={activeDay.blocks}
                highlightedPinId={highlightedPinId}
                onEdit={onEditBlock}
                onRemove={onRemoveBlock}
                onHover={onHoverBlock}
              />

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                <DayNotesField
                  value={activeDay.notes ?? ''}
                  onChange={onUpdateDayNotes}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-slate-200/80 bg-[#f4f7fa]/95 px-5 py-4 backdrop-blur md:px-7">
        <FullTripMapsCta mode={mapMode} onToggle={onToggleFullTrip} />
        {!isOverview && <NextDayCta hasNextDay={hasNextDay} onNext={onNextDay} />}
      </footer>
    </section>
  );
}
