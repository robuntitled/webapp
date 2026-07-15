'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { TimelineStopCard, readTime } from '@/components/composer/plan-v2/TimelineStopCard';
import type { ComposerBlock } from '@/types/composer';

type DayTimelineProps = {
  blocks: ComposerBlock[];
  highlightedPinId: string | null;
  onEdit: (block: ComposerBlock) => void;
  onRemove: (blockId: string) => void;
  onHover: (blockId: string | null) => void;
};

export function DayTimeline({
  blocks,
  highlightedPinId,
  onEdit,
  onRemove,
  onHover,
}: DayTimelineProps) {
  if (blocks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold text-slate-800">
          Nessuna tappa ancora
        </p>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Aggiungi attrazioni, attività o luoghi custom. La timeline e la mappa si
          aggiornano insieme.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-2">
      <div className="absolute bottom-3 left-[1.35rem] top-3 w-px bg-slate-200" aria-hidden />
      <ul className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {blocks.map((block, index) => (
            <motion.li
              key={block.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="relative grid grid-cols-[3.25rem_1fr] gap-3"
            >
              <div className="relative z-10 flex flex-col items-center pt-3">
                <span className="mb-1 text-[11px] font-semibold tabular-nums text-slate-400">
                  {readTime(block)}
                </span>
                <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-sky-400 bg-white shadow-sm" />
                <span className="mt-1 text-[10px] font-medium text-slate-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <TimelineStopCard
                block={block}
                highlighted={highlightedPinId === block.id}
                onEdit={() => onEdit(block)}
                onRemove={() => onRemove(block.id)}
                onHover={(h) => onHover(h ? block.id : null)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
