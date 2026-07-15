'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DayTracker } from '@/components/composer/plan/DayTracker';
import { DayTimeline } from '@/components/composer/plan/DayTimeline';
import { DayNotesField } from '@/components/composer/plan/DayNotesField';
import { CustomStopForm, type CustomStopPayload } from '@/components/composer/plan/CustomStopForm';
import { SuggestDayButton } from '@/components/composer/plan/SuggestDayButton';
import { BLOCK_META } from '@/lib/composer/blocks';
import { formatComposerDayLabel } from '@/lib/composer/days';
import type {
  ComposerBlock,
  ComposerBlockType,
  ComposerDay,
  ComposerDraft,
  ComposerGenerateResponse,
} from '@/types/composer';
import { ArrowRight, Landmark, Plus, Sparkles, Target } from 'lucide-react';

const QUICK_TYPES: { type: ComposerBlockType; icon: typeof Landmark }[] = [
  { type: 'attraction', icon: Landmark },
  { type: 'activity', icon: Target },
];

type DayControlPanelProps = {
  draft: ComposerDraft;
  activeDay: ComposerDay;
  activeDayIndex: number;
  highlightedPinId: string | null;
  onSelectDay: (dayIndex: number) => void;
  onAddDay: () => void;
  onRemoveDay: (dayIndex: number) => void;
  onNextDay: () => void;
  hasNextDay: boolean;
  onUpdateDayTitle: (title: string) => void;
  onUpdateDayNotes: (notes: string) => void;
  onAddQuickType: (type: ComposerBlockType) => void;
  onAddCustomStop: (payload: CustomStopPayload) => void;
  onEditBlock: (block: ComposerBlock) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onDuplicateBlock: (block: ComposerBlock) => void;
  onHoverBlock: (blockId: string | null) => void;
  onDragReorder: (fromIndex: number, toIndex: number) => void;
  onApplyGeneratedDay: (
    response: ComposerGenerateResponse,
    mode: 'replace' | 'append'
  ) => void;
};

export function DayControlPanel({
  draft,
  activeDay,
  activeDayIndex,
  highlightedPinId,
  onSelectDay,
  onAddDay,
  onRemoveDay,
  onNextDay,
  hasNextDay,
  onUpdateDayTitle,
  onUpdateDayNotes,
  onAddQuickType,
  onAddCustomStop,
  onEditBlock,
  onMoveBlock,
  onDuplicateBlock,
  onHoverBlock,
  onDragReorder,
  onApplyGeneratedDay,
}: DayControlPanelProps) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="composer-control-panel flex flex-col h-full min-h-0"
    >
      <div className="shrink-0 space-y-4">
        <DayTracker
          days={draft.days}
          activeDayIndex={activeDayIndex}
          onSelect={onSelectDay}
          onAddDay={onAddDay}
          onRemoveDay={onRemoveDay}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay.dayIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="composer-day-header rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-lg font-bold text-accent tabular-nums">
                {activeDay.dayIndex}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Input
                  className="font-display text-lg md:text-xl border-0 bg-transparent focus-visible:ring-0 px-0 h-auto text-white placeholder:text-white/30"
                  value={activeDay.title}
                  onChange={(e) => onUpdateDayTitle(e.target.value)}
                  placeholder="Titolo della giornata…"
                />
                <p className="text-[11px] text-white/40 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-accent/60" />
                  {formatComposerDayLabel(activeDay.date, activeDay.dayIndex)}
                </p>
              </div>
              <SuggestDayButton
                draft={draft}
                activeDay={activeDay}
                onApplied={onApplyGeneratedDay}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="composer-glass rounded-2xl p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 px-1">
            Aggiungi tappa
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TYPES.map(({ type, icon: Icon }) => {
              const meta = BLOCK_META[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onAddQuickType(type)}
                  className={`composer-palette-item flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-gradient-to-br text-left ${meta.color}`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="text-xs font-semibold text-white/90">{meta.label}</span>
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-9 rounded-xl border-dashed border-white/15 text-white/60 hover:text-accent hover:border-accent/40 hover:bg-accent/5 text-xs"
            onClick={() => setCustomOpen((v) => !v)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {customOpen ? 'Chiudi form custom' : 'Tappa custom'}
          </Button>
          <CustomStopForm
            open={customOpen}
            onOpenChange={setCustomOpen}
            onSubmit={onAddCustomStop}
          />
        </div>

        <div className="composer-glass rounded-2xl p-3">
          <DayNotesField
            value={activeDay.notes ?? ''}
            onChange={onUpdateDayNotes}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 mt-4 pr-1 composer-scroll">
        <AnimatePresence mode="wait">
          <motion.div
            key={`timeline-${activeDay.dayIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {activeDay.blocks.length === 0 ? (
              <div className="composer-empty-day rounded-2xl p-10 text-center">
                <p className="font-display text-xl font-semibold text-white">
                  Programma del giorno
                </p>
                <p className="text-sm text-white/40 mt-2 max-w-xs mx-auto leading-relaxed">
                  Aggiungi un&apos;attrazione, un&apos;attività o una tappa custom. La mappa
                  si aggiorna in tempo reale.
                </p>
              </div>
            ) : (
              <DayTimeline
                blocks={activeDay.blocks}
                highlightedPinId={highlightedPinId}
                onEdit={onEditBlock}
                onMoveUp={(i) => onMoveBlock(i, -1)}
                onMoveDown={(i) => onMoveBlock(i, 1)}
                onDuplicate={onDuplicateBlock}
                onHover={onHoverBlock}
                onDragReorder={onDragReorder}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 pt-4">
        <Button
          type="button"
          onClick={onNextDay}
          disabled={!hasNextDay}
          className="w-full h-11 rounded-2xl font-semibold shadow-lg shadow-accent/15"
        >
          {hasNextDay ? (
            <>
              Passa al Giorno Successivo
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            'Ultimo giorno del viaggio'
          )}
        </Button>
      </div>
    </motion.section>
  );
}
