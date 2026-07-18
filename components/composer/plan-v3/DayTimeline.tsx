'use client';

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
          Aggiungi attività, trasporti o hotel — la timeline si aggiorna in tempo reale.
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
              {blocks.map((block, index) => {
                const s = schedule.get(block.id);
                let timeRange = '';
                if (block.type === 'hotel') {
                  const isCheckout = block.content.hotelPhase === 'checkout';
                  if (isCheckout) {
                    const co =
                      typeof block.content.checkOutTime === 'string'
                        ? block.content.checkOutTime
                        : s?.start ?? '11:00';
                    timeRange = `Check-out ${co}`;
                  } else {
                    const ci =
                      typeof block.content.checkInTime === 'string'
                        ? block.content.checkInTime
                        : s?.start;
                    const nights =
                      typeof block.content.nights === 'number' ? block.content.nights : 1;
                    const co =
                      typeof block.content.checkOutTime === 'string'
                        ? block.content.checkOutTime
                        : '11:00';
                    timeRange = ci
                      ? `Check-in ${ci} · out +${nights}g ${co}`
                      : `out +${nights}g ${co}`;
                  }
                } else if (s) {
                  timeRange =
                    s.durationMinutes === 0
                      ? s.start
                      : formatTimeRange(s.start, s.end);
                }
                return (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <li
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`relative grid grid-cols-[3.5rem_1fr] gap-3 ${
                          snapshot.isDragging ? 'z-20 opacity-95' : ''
                        }`}
                        style={dragProvided.draggableProps.style}
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
                          onUpdateNotes={(notes) => onUpdateNotes(block.id, notes)}
                          onAddAttachment={(label, url) =>
                            onAddAttachment(block.id, label, url)
                          }
                          onRemoveAttachment={(id) => onRemoveAttachment(block.id, id)}
                          dragHandleProps={dragProvided.dragHandleProps ?? undefined}
                        />
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export { attachmentsList };