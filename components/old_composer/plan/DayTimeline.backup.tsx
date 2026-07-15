'use client';

import { AnimatePresence } from 'framer-motion';
import { BlockCard } from '@/components/composer/plan/BlockCard';
import { groupBlocksByTimeSlot } from '@/lib/composer/planning';
import { TIME_SLOTS } from '@/lib/composer/time-slots';
import type { ComposerBlock } from '@/types/composer';

type DayTimelineProps = {
  blocks: ComposerBlock[];
  highlightedPinId: string | null;
  onEdit: (block: ComposerBlock) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (block: ComposerBlock) => void;
  onHover: (blockId: string | null) => void;
  onDragReorder: (fromIndex: number, toIndex: number) => void;
};

export function DayTimeline({
  blocks,
  highlightedPinId,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onHover,
  onDragReorder,
}: DayTimelineProps) {
  const grouped = groupBlocksByTimeSlot(blocks);
  const flatIndex = (blockId: string) => blocks.findIndex((b) => b.id === blockId);

  return (
    <div className="space-y-6">
      {TIME_SLOTS.map((slot) => {
        const slotBlocks = grouped[slot.id];
        if (slotBlocks.length === 0) return null;

        return (
          <div key={slot.id} className="space-y-2">
            <div className="flex items-center gap-2 px-1 sticky top-0 z-10 py-1">
              <span className="text-sm">{slot.emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                {slot.label}
              </span>
              <span className="text-[10px] text-white/25">{slot.hours}</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <AnimatePresence mode="popLayout">
              {slotBlocks.map((block) => {
                const index = flatIndex(block.id);
                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    total={blocks.length}
                    isHighlighted={highlightedPinId === block.id}
                    onEdit={() => onEdit(block)}
                    onMoveUp={() => onMoveUp(index)}
                    onMoveDown={() => onMoveDown(index)}
                    onDuplicate={() => onDuplicate(block)}
                    onHover={(hovering) => onHover(hovering ? block.id : null)}
                    onDragReorder={onDragReorder}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}