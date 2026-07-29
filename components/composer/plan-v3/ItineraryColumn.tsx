'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DayTracker, type DayTrackerSelection } from '@/components/composer/plan-v3/DayTracker';
import { DayTimeline } from '@/components/composer/plan-v3/DayTimeline';
import { NextDayCta } from '@/components/composer/plan-v3/NextDayCta';
import { FullTripMapsCta } from '@/components/composer/plan-v3/FullTripMapsCta';
import { DayNotesField } from '@/components/composer/plan/DayNotesField';
import { SuggestDayButton } from '@/components/composer/plan/SuggestDayButton';
import { formatComposerDayLabel } from '@/lib/composer/days';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type {
  ComposerBlock,
  ComposerDay,
  ComposerDraft,
  ComposerGenerateResponse,
} from '@/types/composer';
import { Bus, ChevronLeft, ChevronRight, Hotel, Plus, Sparkles } from 'lucide-react';

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
  onReorderBlocks: (fromIndex: number, toIndex: number) => void;
  onAddTransport: () => void;
  onAddHotel: () => void;
  onApplyGeneratedDay: (
    response: ComposerGenerateResponse,
    mode: 'replace' | 'append'
  ) => void;
  onUpdateBlockNotes: (blockId: string, notes: string) => void;
  onAddAttachment: (blockId: string, label: string, url: string) => void;
  onRemoveAttachment: (blockId: string, id: string) => void;
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
  onReorderBlocks,
  onAddTransport,
  onAddHotel,
  onApplyGeneratedDay,
  onUpdateBlockNotes,
  onAddAttachment,
  onRemoveAttachment,
  onBack,
  onReview,
  canReview,
}: ItineraryColumnProps) {
  const isOverview = selection === 'overview';

  return (
    <section className="composer-v3-itinerary flex h-full min-h-0 flex-col">
      <header className="relative z-10 shrink-0 space-y-4 border-b border-white/10 bg-[#0b1120]/95 px-5 py-4 backdrop-blur md:px-7">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-9 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Inizio</span>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Composer
            </p>
            <p className="truncate text-sm font-medium text-white/90">
              {draft.destinationMeta?.label ?? draft.destination}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onReview}
            disabled={!canReview}
            className="h-9 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 font-semibold text-white shadow-lg shadow-orange-500/20 hover:brightness-110 disabled:opacity-40"
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
              <h2 className="font-display text-2xl font-semibold text-white">Overview viaggio</h2>
              <p className="text-sm text-white/50">
                Seleziona un giorno per pianificare, oppure mostra il percorso completo sulla mappa.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {draft.days.map((day) => (
                  <button
                    key={day.dayIndex}
                    type="button"
                    onClick={() => onSelect(day.dayIndex)}
                    className="composer-v3-overview-card"
                  >
                    <p className="text-sm font-semibold text-white">Giorno {day.dayIndex}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {formatComposerDayLabel(day.date, day.dayIndex)}
                    </p>
                    <p className="mt-3 text-xs font-medium text-amber-400">
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
                  className="h-auto border-0 bg-transparent px-0 font-display text-2xl font-semibold text-white shadow-none placeholder:text-white/25 focus-visible:ring-0"
                />
                <p className="text-xs text-white/40">
                  <Sparkles className="mr-1 inline h-3 w-3 text-amber-400/70" />
                  {formatComposerDayLabel(activeDay.date, activeDay.dayIndex)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={onAddActivity}
                  className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 font-bold text-white shadow-lg shadow-orange-500/20 hover:brightness-110"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Aggiungi
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAddTransport}
                  className="h-11 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <Bus className="mr-1.5 h-4 w-4" />
                  Trasporto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAddHotel}
                  className="h-11 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <Hotel className="mr-1.5 h-4 w-4" />
                  Hotel
                </Button>
                <SuggestDayButton
                  draft={draft}
                  activeDay={activeDay}
                  onApplied={onApplyGeneratedDay}
                />
              </div>

              <DayTimeline
                blocks={activeDay.blocks}
                highlightedPinId={highlightedPinId}
                onEdit={onEditBlock}
                onRemove={onRemoveBlock}
                onHover={onHoverBlock}
                onReorder={onReorderBlocks}
                onUpdateNotes={onUpdateBlockNotes}
                onAddAttachment={onAddAttachment}
                onRemoveAttachment={onRemoveAttachment}
              />

              <DayNotesField
                value={activeDay.notes ?? ''}
                onChange={onUpdateDayNotes}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-white/10 px-5 py-4 md:px-7">
        <FullTripMapsCta mode={mapMode} onToggle={onToggleFullTrip} />
        {!isOverview && <NextDayCta hasNextDay={hasNextDay} onNext={onNextDay} />}
      </footer>
    </section>
  );
}
