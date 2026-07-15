'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BlockEditorPanel } from '@/components/composer/BlockEditorPanel';
import { DayControlPanel } from '@/components/composer/plan/DayControlPanel';
import { ComposerMapPanel } from '@/components/composer/plan/ComposerMapPanel';
import type { CustomStopPayload } from '@/components/composer/plan/CustomStopForm';
import { createEmptyBlock } from '@/lib/composer/blocks';
import { duplicateBlock } from '@/lib/composer/planning';
import {
  appendComposerDay,
  endDateFromDays,
  removeComposerDay,
} from '@/lib/composer/days';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import type { TimeSlot } from '@/lib/composer/time-slots';
import type {
  ComposerBlock,
  ComposerBlockType,
  ComposerDay,
  ComposerDraft,
  ComposerGenerateResponse,
} from '@/types/composer';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type ComposerPlanStepProps = {
  draft: ComposerDraft;
  onChangeDays: (days: ComposerDay[]) => void;
  onPatchDraft?: (patch: Partial<ComposerDraft>) => void;
  onBack: () => void;
  onReview: () => void;
};

export function ComposerPlanStep({
  draft,
  onChangeDays,
  onPatchDraft,
  onBack,
  onReview,
}: ComposerPlanStepProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(1);
  const [editingBlock, setEditingBlock] = useState<ComposerBlock | null>(null);
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);

  const activeDay = draft.days.find((d) => d.dayIndex === activeDayIndex) ?? draft.days[0];
  const hasNextDay = draft.days.some((d) => d.dayIndex === activeDayIndex + 1);
  const totalBlocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);

  const pins = useMemo(
    () =>
      buildPinsFromDraft(draft, {
        activeDayIndex,
        dayFilter: activeDayIndex,
      }),
    [draft, activeDayIndex]
  );

  const updateDay = (dayIndex: number, updater: (day: ComposerDay) => ComposerDay) => {
    onChangeDays(draft.days.map((d) => (d.dayIndex === dayIndex ? updater(d) : d)));
  };

  const commitDays = (days: ComposerDay[]) => {
    if (onPatchDraft) {
      onPatchDraft({ days, endDate: endDateFromDays(days) });
    } else {
      onChangeDays(days);
    }
  };

  const addDay = () => {
    const days = appendComposerDay(draft.days);
    commitDays(days);
    setActiveDayIndex(days[days.length - 1].dayIndex);
    toast.success(`Giorno ${days.length} aggiunto`);
  };

  const removeDay = (dayIndex: number) => {
    if (draft.days.length <= 1) {
      toast.message('Serve almeno un giorno');
      return;
    }
    const days = removeComposerDay(draft.days, dayIndex);
    commitDays(days);
    setActiveDayIndex((prev) => Math.min(prev, days.length));
    toast.message('Giorno rimosso');
  };

  const goToNextDay = () => {
    if (!hasNextDay) return;
    setActiveDayIndex(activeDayIndex + 1);
    setHighlightedPinId(null);
  };

  const addBlock = (
    type: ComposerBlockType,
    extra?: Record<string, unknown>,
    timeSlot?: TimeSlot
  ) => {
    if (!activeDay) return;
    const block = createEmptyBlock(type, activeDay.blocks.length, {
      timeSlot: timeSlot ?? 'flex',
      ...extra,
    });
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: [...d.blocks, block],
    }));
    setEditingBlock(block);
    setHighlightedPinId(block.id);
  };

  const addCustomStop = (payload: CustomStopPayload) => {
    if (!activeDay) return;
    const block = createEmptyBlock(payload.type, activeDay.blocks.length, {
      title: payload.title,
      place: payload.place,
      notes: payload.note,
      time: payload.time,
      lat: payload.lat,
      lng: payload.lng,
      timeSlot: 'flex',
    });
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: [...d.blocks, block],
    }));
    setHighlightedPinId(block.id);
    toast.success('Tappa aggiunta');
  };

  const addPinFromMap = (lat: number, lng: number) => {
    addBlock('attraction', {
      title: 'Nuova tappa',
      place: 'Segnata sulla mappa',
      lat,
      lng,
    });
  };

  const updateBlock = (blockId: string, updater: (block: ComposerBlock) => ComposerBlock) => {
    if (!activeDay) return;
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: d.blocks.map((b) => (b.id === blockId ? updater(b) : b)),
    }));
    if (editingBlock?.id === blockId) {
      setEditingBlock((prev) => (prev ? updater(prev) : null));
    }
  };

  const removeBlock = (blockId: string) => {
    if (!activeDay) return;
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: d.blocks.filter((b) => b.id !== blockId),
    }));
    if (editingBlock?.id === blockId) setEditingBlock(null);
    if (highlightedPinId === blockId) setHighlightedPinId(null);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    if (!activeDay) return;
    const target = index + direction;
    if (target < 0 || target >= activeDay.blocks.length) return;
    const blocks = [...activeDay.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
    }));
  };

  const dragReorder = (fromIndex: number, toIndex: number) => {
    if (!activeDay || fromIndex === toIndex) return;
    const blocks = [...activeDay.blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
    }));
  };

  const duplicateBlockInDay = (block: ComposerBlock) => {
    if (!activeDay) return;
    const copy = duplicateBlock(block, activeDay.blocks.length);
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: [...d.blocks, copy],
    }));
    toast.success('Blocco duplicato');
  };

  const applyGeneratedDay = (
    response: ComposerGenerateResponse,
    mode: 'replace' | 'append'
  ) => {
    if (!activeDay) return;
    updateDay(activeDay.dayIndex, (d) => {
      const blocks =
        mode === 'replace'
          ? response.blocks.map((b, i) => ({ ...b, sortOrder: i }))
          : [
              ...d.blocks,
              ...response.blocks.map((b, i) => ({
                ...b,
                sortOrder: d.blocks.length + i,
              })),
            ];
      return {
        ...d,
        title: mode === 'replace' ? response.suggestedTitle : d.title,
        blocks,
      };
    });
  };

  if (!activeDay) return null;

  return (
    <div className="composer-workspace flex flex-col min-h-[calc(100vh-4rem)] pb-20">
      <header className="sticky top-16 z-30 composer-plan-toolbar border-b border-white/8 shrink-0">
        <div className="px-4 md:px-6 py-3 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="rounded-full text-white/70 hover:text-white hover:bg-white/10 shrink-0 h-9"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Inizio</span>
          </Button>

          <div className="flex-1 min-w-0 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Composer · {draft.destinationMeta?.label ?? draft.destination}
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
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-0 xl:gap-0">
        <div className="xl:col-span-5 2xl:col-span-4 border-b xl:border-b-0 xl:border-r border-white/8 min-h-0">
          <div className="h-full max-h-[70vh] xl:max-h-none xl:h-[calc(100vh-8.5rem)] p-4 md:p-5">
            <DayControlPanel
              draft={draft}
              activeDay={activeDay}
              activeDayIndex={activeDayIndex}
              highlightedPinId={highlightedPinId}
              onSelectDay={(idx) => {
                setActiveDayIndex(idx);
                setHighlightedPinId(null);
              }}
              onAddDay={addDay}
              onRemoveDay={removeDay}
              onNextDay={goToNextDay}
              hasNextDay={hasNextDay}
              onUpdateDayTitle={(title) =>
                updateDay(activeDay.dayIndex, (d) => ({ ...d, title }))
              }
              onUpdateDayNotes={(notes) =>
                updateDay(activeDay.dayIndex, (d) => ({
                  ...d,
                  notes: notes || undefined,
                }))
              }
              onAddQuickType={(type) => addBlock(type)}
              onAddCustomStop={addCustomStop}
              onEditBlock={setEditingBlock}
              onMoveBlock={moveBlock}
              onDuplicateBlock={duplicateBlockInDay}
              onHoverBlock={setHighlightedPinId}
              onDragReorder={dragReorder}
              onApplyGeneratedDay={applyGeneratedDay}
            />
          </div>
        </div>

        <div className="xl:col-span-7 2xl:col-span-8 min-h-0 p-4 md:p-5">
          <div className="h-[420px] xl:h-[calc(100vh-8.5rem)]">
            <ComposerMapPanel
              draft={draft}
              pins={pins}
              activeDayIndex={activeDayIndex}
              highlightedPinId={highlightedPinId}
              onPinClick={(pin) => {
                if (pin.blockId) {
                  setActiveDayIndex(pin.dayIndex);
                  setHighlightedPinId(pin.blockId);
                  const day = draft.days.find((d) => d.dayIndex === pin.dayIndex);
                  const block = day?.blocks.find((b) => b.id === pin.blockId);
                  if (block) setEditingBlock(block);
                }
              }}
              onMapClick={addPinFromMap}
            />
          </div>
        </div>
      </div>

      <BlockEditorPanel
        block={editingBlock}
        draft={draft}
        open={!!editingBlock}
        onOpenChange={(open) => !open && setEditingBlock(null)}
        onUpdate={updateBlock}
        onRemove={removeBlock}
      />
    </div>
  );
}
