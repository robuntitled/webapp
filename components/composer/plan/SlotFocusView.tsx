'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BlockPalette } from '@/components/composer/plan/BlockPalette';
import { BlockCard } from '@/components/composer/plan/BlockCard';
import { SuggestDayButton } from '@/components/composer/plan/SuggestDayButton';
import { formatComposerDayLabel } from '@/lib/composer/days';
import { groupBlocksByTimeSlot } from '@/lib/composer/planning';
import { TIME_SLOTS, type TimeSlot } from '@/lib/composer/time-slots';
import type {
  ComposerBlock,
  ComposerBlockType,
  ComposerDay,
  ComposerDraft,
  ComposerGenerateResponse,
} from '@/types/composer';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const FOCUS_SLOTS: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night', 'flex'];

type SlotFocusViewProps = {
  draft: ComposerDraft;
  activeDay: ComposerDay;
  activeDayIndex: number;
  selectedSlot: TimeSlot;
  highlightedPinId: string | null;
  onSlotChange: (slot: TimeSlot) => void;
  onDayChange: (dayIndex: number) => void;
  onUpdateDayTitle: (title: string) => void;
  onAddBlock: (type: ComposerBlockType, slot: TimeSlot) => void;
  onEditBlock: (block: ComposerBlock) => void;
  onMoveBlock: (index: number, direction: -1 | 1) => void;
  onDuplicateBlock: (block: ComposerBlock) => void;
  onHoverBlock: (blockId: string | null) => void;
  onDragReorder: (fromIndex: number, toIndex: number) => void;
  onApplyGeneratedDay: (response: ComposerGenerateResponse, mode: 'replace' | 'append') => void;
};

export function SlotFocusView({
  draft,
  activeDay,
  activeDayIndex,
  selectedSlot,
  highlightedPinId,
  onSlotChange,
  onDayChange,
  onUpdateDayTitle,
  onAddBlock,
  onEditBlock,
  onMoveBlock,
  onDuplicateBlock,
  onHoverBlock,
  onDragReorder,
  onApplyGeneratedDay,
}: SlotFocusViewProps) {
  const slotMeta = TIME_SLOTS.find((s) => s.id === selectedSlot) ?? TIME_SLOTS[0];
  const slotIndex = FOCUS_SLOTS.indexOf(selectedSlot);

  const grouped = useMemo(
    () => groupBlocksByTimeSlot(activeDay.blocks),
    [activeDay.blocks]
  );
  const slotBlocks = grouped[selectedSlot] ?? [];

  const flatIndex = (blockId: string) => activeDay.blocks.findIndex((b) => b.id === blockId);

  const prevSlot = () => {
    if (slotIndex > 0) onSlotChange(FOCUS_SLOTS[slotIndex - 1]);
  };

  const nextSlot = () => {
    if (slotIndex < FOCUS_SLOTS.length - 1) onSlotChange(FOCUS_SLOTS[slotIndex + 1]);
  };

  const prevDay = () => {
    if (activeDayIndex > 1) onDayChange(activeDayIndex - 1);
  };

  const nextDay = () => {
    if (activeDayIndex < draft.days.length) onDayChange(activeDayIndex + 1);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto flex flex-col gap-4"
    >
      <div className="composer-day-header rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-white/60 hover:text-white h-8"
            disabled={activeDayIndex <= 1}
            onClick={prevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Giorno {activeDay.dayIndex} di {draft.days.length}
            </p>
            <p className="text-xs text-white/50">
              {formatComposerDayLabel(activeDay.date, activeDay.dayIndex)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-white/60 hover:text-white h-8"
            disabled={activeDayIndex >= draft.days.length}
            onClick={nextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Input
          className="font-display text-xl border-0 bg-transparent focus-visible:ring-0 px-0 h-auto text-white placeholder:text-white/30 text-center"
          value={activeDay.title}
          onChange={(e) => onUpdateDayTitle(e.target.value)}
          placeholder="Titolo della giornata..."
        />
      </div>

      <div className="composer-glass rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-white/50 hover:text-white h-9 w-9 shrink-0"
            disabled={slotIndex <= 0}
            onClick={prevSlot}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 text-center min-w-0">
            <div className="text-3xl mb-1">{slotMeta.emoji}</div>
            <p className="font-display text-lg font-semibold text-white">{slotMeta.label}</p>
            <p className="text-xs text-white/45">{slotMeta.hours}</p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-white/50 hover:text-white h-9 w-9 shrink-0"
            disabled={slotIndex >= FOCUS_SLOTS.length - 1}
            onClick={nextSlot}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 justify-center">
          {FOCUS_SLOTS.map((slot) => {
            const meta = TIME_SLOTS.find((s) => s.id === slot)!;
            const count = grouped[slot]?.length ?? 0;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onSlotChange(slot)}
                className={`composer-time-chip shrink-0 relative ${
                  selectedSlot === slot ? 'composer-time-chip-active' : ''
                }`}
              >
                <span>{meta.emoji}</span>
                <span className="hidden sm:inline">{meta.label}</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="composer-glass rounded-2xl p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-3">
          Aggiungi in {slotMeta.label.toLowerCase()}
        </p>
        <BlockPalette
          selectedSlot={selectedSlot}
          onSlotChange={onSlotChange}
          onAdd={onAddBlock}
        />
      </div>

      <div className="min-h-[200px]">
        {slotBlocks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="composer-empty-day rounded-2xl p-10 text-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="text-5xl mb-4"
            >
              {slotMeta.emoji}
            </motion.div>
            <p className="font-display text-xl font-semibold text-white">
              Niente in {slotMeta.label.toLowerCase()}
            </p>
            <p className="text-sm text-white/45 mt-2 max-w-xs mx-auto">
              Usa la palette sopra oppure{' '}
              <strong className="text-white/70">Suggerisci giornata</strong> per riempire tutto il
              giorno.
            </p>
            <div className="mt-4 flex justify-center">
              <SuggestDayButton
                draft={draft}
                activeDay={activeDay}
                onApplied={onApplyGeneratedDay}
              />
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {slotBlocks.map((block) => {
              const index = flatIndex(block.id);
              return (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={index}
                  total={activeDay.blocks.length}
                  isHighlighted={highlightedPinId === block.id}
                  onEdit={() => onEditBlock(block)}
                  onMoveUp={() => onMoveBlock(index, -1)}
                  onMoveDown={() => onMoveBlock(index, 1)}
                  onDuplicate={() => onDuplicateBlock(block)}
                  onHover={(hovering) => onHoverBlock(hovering ? block.id : null)}
                  onDragReorder={onDragReorder}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-white/35 pb-2">
        <Sparkles className="h-3 w-3" />
        Modalità focus — un giorno e una fascia alla volta
      </div>
    </motion.div>
  );
}