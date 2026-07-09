'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BLOCK_META,
  createEmptyBlock,
  getBlockDisplayPrice,
  getBlockDisplayTitle,
} from '@/lib/composer/blocks';
import { formatComposerDayLabel } from '@/lib/composer/days';
import { BlockEditorPanel } from '@/components/composer/BlockEditorPanel';
import type { ComposerBlock, ComposerBlockType, ComposerDay, ComposerDraft } from '@/types/composer';
import { ChevronLeft, ChevronRight, GripVertical, Pencil, Plus } from 'lucide-react';

const PALETTE_TYPES: ComposerBlockType[] = [
  'flight',
  'hotel',
  'attraction',
  'activity',
  'meal',
  'transport',
  'free_time',
  'note',
];

type ComposerPlanStepProps = {
  draft: ComposerDraft;
  onChangeDays: (days: ComposerDay[]) => void;
  onBack: () => void;
  onReview: () => void;
};

export function ComposerPlanStep({ draft, onChangeDays, onBack, onReview }: ComposerPlanStepProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(1);
  const [editingBlock, setEditingBlock] = useState<ComposerBlock | null>(null);

  const activeDay = draft.days.find((d) => d.dayIndex === activeDayIndex) ?? draft.days[0];
  const dayPos = draft.days.findIndex((d) => d.dayIndex === activeDayIndex);

  const updateDay = (dayIndex: number, updater: (day: ComposerDay) => ComposerDay) => {
    onChangeDays(draft.days.map((d) => (d.dayIndex === dayIndex ? updater(d) : d)));
  };

  const addBlock = (type: ComposerBlockType) => {
    if (!activeDay) return;
    const block = createEmptyBlock(type, activeDay.blocks.length);
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: [...d.blocks, block],
    }));
    setEditingBlock(block);
  };

  const updateBlock = (
    blockId: string,
    updater: (block: ComposerBlock) => ComposerBlock
  ) => {
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
  };

  const totalBlocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      <div className="sticky top-16 z-30 composer-glass border-b border-white/10 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="rounded-full text-white/80">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Meta
          </Button>
          <div className="text-center min-w-0">
            <p className="text-xs text-accent uppercase tracking-widest">Step 2 · Componi</p>
            <p className="font-display text-lg text-white truncate">{draft.destination}</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="rounded-full shrink-0"
            onClick={onReview}
            disabled={totalBlocks === 0}
          >
            Rivedi
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Day rail */}
        <div className="lg:col-span-3 space-y-3">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider px-1">
            Timeline
          </p>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {draft.days.map((day) => {
              const active = day.dayIndex === activeDayIndex;
              const count = day.blocks.length;
              return (
                <button
                  key={day.dayIndex}
                  type="button"
                  onClick={() => setActiveDayIndex(day.dayIndex)}
                  className={`shrink-0 lg:w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    active
                      ? 'border-accent bg-accent/15 shadow-lg shadow-accent/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">
                    Giorno {day.dayIndex}
                  </p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {formatComposerDayLabel(day.date, day.dayIndex).split('·')[1]?.trim()}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {count === 0 ? (
                      <span className="text-[10px] text-white/40">Vuoto — aggiungi blocchi</span>
                    ) : (
                      <span className="text-[10px] rounded-full bg-white/15 px-2 py-0.5 text-white/80">
                        {count} {count === 1 ? 'blocco' : 'blocchi'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-6 space-y-4">
          {activeDay && (
            <>
              <div className="composer-glass rounded-2xl p-4">
                <Input
                  className="font-display text-lg border-0 bg-transparent focus-visible:ring-0 px-0"
                  value={activeDay.title}
                  onChange={(e) =>
                    updateDay(activeDay.dayIndex, (d) => ({ ...d, title: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {formatComposerDayLabel(activeDay.date, activeDay.dayIndex)}
                </p>
              </div>

              <AnimatePresence mode="popLayout">
                {activeDay.blocks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="composer-glass rounded-3xl border-2 border-dashed border-accent/30 p-12 text-center"
                  >
                    <p className="text-4xl mb-3">🗺️</p>
                    <p className="font-display text-xl text-white">Questo giorno è una tela vuota</p>
                    <p className="text-sm text-white/60 mt-2 max-w-sm mx-auto">
                      Aggiungi un volo, un hotel o un&apos;attività dal pannello a destra — poi
                      confronta le alternative.
                    </p>
                  </motion.div>
                ) : (
                  activeDay.blocks.map((block, index) => {
                    const meta = BLOCK_META[block.type];
                    const price = getBlockDisplayPrice(block);
                    return (
                      <motion.div
                        key={block.id}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`composer-block rounded-2xl border bg-gradient-to-br ${meta.color} p-4`}
                      >
                        <div className="flex items-start gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-1 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span>{meta.emoji}</span>
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                {meta.label}
                              </span>
                              {block.alternatives.length > 0 && (
                                <span className="text-[10px] rounded-full bg-background/80 px-2 py-0.5 border">
                                  +{block.alternatives.length} alt.
                                </span>
                              )}
                            </div>
                            <p className="font-semibold mt-1 truncate">
                              {getBlockDisplayTitle(block)}
                            </p>
                            {price != null && (
                              <p className="text-sm text-primary font-bold tabular-nums mt-1">
                                {price}€
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="shrink-0 rounded-full"
                            onClick={() => setEditingBlock(block)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-1 mt-3 ml-7">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={index === 0}
                            onClick={() => {
                              const blocks = [...activeDay.blocks];
                              [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
                              updateDay(activeDay.dayIndex, (d) => ({
                                ...d,
                                blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
                              }));
                            }}
                          >
                            ↑
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={index === activeDay.blocks.length - 1}
                            onClick={() => {
                              const blocks = [...activeDay.blocks];
                              [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
                              updateDay(activeDay.dayIndex, (d) => ({
                                ...d,
                                blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
                              }));
                            }}
                          >
                            ↓
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Palette */}
        <div className="lg:col-span-3">
          <div className="composer-glass rounded-2xl p-4 sticky top-36 space-y-3">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Aggiungi al giorno {activeDayIndex}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {PALETTE_TYPES.map((type) => {
                const meta = BLOCK_META[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 hover:bg-accent/10 hover:border-accent/30 px-3 py-2.5 text-left transition-all group"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">
                      {meta.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{meta.label}</p>
                      <p className="text-[10px] text-white/45 truncate">{meta.hint}</p>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-white/40 ml-auto shrink-0" />
                  </button>
                );
              })}
            </div>
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