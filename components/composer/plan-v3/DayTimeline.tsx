'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  TimelineStopCard,
  attachmentsList,
} from '@/components/composer/plan-v3/TimelineStopCard';
import {
  computeDaySchedule,
  formatTimeRange,
} from '@/lib/composer/time-progression';
import type { ComposerBlock } from '@/types/composer';

type DayTimelineProps = {
  blocks: ComposerBlock[];
  highlightedPinId: string | null;
  onEdit: (block: ComposerBlock) => void;
  onRemove: (blockId: string) => void;
  onHover: (blockId: string | null) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleFavorite: (blockId: string) => void;
  onUpdateNotes: (blockId: string, notes: string) => void;
  onAddAttachment: (blockId: string, label: string, url: string) => void;
  onRemoveAttachment: (blockId: string, id: string) => void;
};

export function DayTimeline({
  blocks,
  highlightedPinId,
  onEdit,
  onRemove,
  onHover,
  onReorder,
  onToggleFavorite,
  onUpdateNotes,
  onAddAttachment,
  onRemoveAttachment,
}: DayTimelineProps) {
  const schedule = computeDaySchedule(blocks);

  if (blocks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold text-white">Nessuna tappa ancora</p>
        <p className="mt-2 max-w-sm text-sm text-white/45">
          Aggiungi attrazioni, attività o luoghi. La timeline scura e la mappa Mapbox si
          aggiornano insieme.
        </p>
      </div>
    );
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div className="relative pl-1">
      <div
        className="absolute bottom-4 left-[1.55rem] top-4 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent"
        aria-hidden
      />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="day-stops">
          {(provided) => (
            <ul
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-7"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {blocks.map((block, index) => {
                  const s = schedule.get(block.id);
                  const timeRange = s
                    ? formatTimeRange(s.start, s.end)
                    : '';
                  return (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <motion.li
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`relative grid grid-cols-[3.5rem_1fr] gap-3 ${
                            snapshot.isDragging ? 'opacity-90' : ''
                          }`}
                        >
                          <div className="relative z-10 flex flex-col items-center pt-3">
                            <span className="mb-1 text-[11px] font-bold tabular-nums text-white/70">
                              {s?.start ?? '—'}
                            </span>
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-amber-400 bg-[#0f172a] shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                            <span className="mt-1 text-[10px] font-medium text-white/25">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <TimelineStopCard
                            block={block}
                            highlighted={highlightedPinId === block.id}
                            timeRange={timeRange}
                            transit={s?.transitToNext}
                            isFirst={index === 0}
                            isLast={index === blocks.length - 1}
                            onEdit={() => onEdit(block)}
                            onRemove={() => onRemove(block.id)}
                            onHover={(h) => onHover(h ? block.id : null)}
                            onToggleFavorite={() => onToggleFavorite(block.id)}
                            onUpdateNotes={(notes) => onUpdateNotes(block.id, notes)}
                            onAddAttachment={(label, url) =>
                              onAddAttachment(block.id, label, url)
                            }
                            onRemoveAttachment={(id) => onRemoveAttachment(block.id, id)}
                            dragHandleProps={(dragProvided.dragHandleProps ?? undefined) as Record<string, unknown> | undefined}
                          />
                        </motion.li>
                      )}
                    </Draggable>
                  );
                })}
              </AnimatePresence>
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export { attachmentsList };
