'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { TripMap } from '@/components/maps/TripMap';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import { createEmptyBlock } from '@/lib/composer/blocks';
import { formatComposerDayLabel } from '@/lib/composer/days';
import { BlockEditorPanel } from '@/components/composer/BlockEditorPanel';
import { BlockCard } from '@/components/composer/plan/BlockCard';
import { BlockPalette } from '@/components/composer/plan/BlockPalette';
import { ComposerPlanToolbar, type PlanViewMode } from '@/components/composer/plan/ComposerPlanToolbar';
import { DaySelector } from '@/components/composer/plan/DaySelector';
import type { ComposerBlock, ComposerBlockType, ComposerDay, ComposerDraft } from '@/types/composer';
import { MessageCircle, Sparkles } from 'lucide-react';

type ComposerPlanStepProps = {
  draft: ComposerDraft;
  onChangeDays: (days: ComposerDay[]) => void;
  onBack: () => void;
  onReview: () => void;
};

export function ComposerPlanStep({ draft, onChangeDays, onBack, onReview }: ComposerPlanStepProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(1);
  const [editingBlock, setEditingBlock] = useState<ComposerBlock | null>(null);
  const [highlightedPinId, setHighlightedPinId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<PlanViewMode>('split');

  const activeDay = draft.days.find((d) => d.dayIndex === activeDayIndex) ?? draft.days[0];

  const pins = useMemo(
    () => buildPinsFromDraft(draft, { activeDayIndex }),
    [draft, activeDayIndex]
  );

  const updateDay = (dayIndex: number, updater: (day: ComposerDay) => ComposerDay) => {
    onChangeDays(draft.days.map((d) => (d.dayIndex === dayIndex ? updater(d) : d)));
  };

  const addBlock = (type: ComposerBlockType, extra?: Record<string, unknown>) => {
    if (!activeDay) return;
    const block = createEmptyBlock(type, activeDay.blocks.length);
    if (extra) block.content = { ...block.content, ...extra };
    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: [...d.blocks, block],
    }));
    setEditingBlock(block);
    setHighlightedPinId(block.id);
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

  const totalBlocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);
  const showPlan = viewMode === 'split' || viewMode === 'plan';
  const showMap = viewMode === 'split' || viewMode === 'map';

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <ComposerPlanToolbar
        draft={draft}
        viewMode={viewMode}
        totalBlocks={totalBlocks}
        onBack={onBack}
        onReview={onReview}
        onViewChange={setViewMode}
      />

      <div className="container mx-auto px-4 py-4">
        <DaySelector
          days={draft.days}
          activeDayIndex={activeDayIndex}
          onSelect={setActiveDayIndex}
        />
      </div>

      <div className="flex-1 container mx-auto px-4 pb-6">
        <div
          className={`grid gap-5 h-full ${
            viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {showPlan && activeDay && (
            <motion.div
              layout
              className="flex flex-col gap-4 min-h-0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="composer-day-header rounded-2xl p-5 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-lg font-bold text-accent tabular-nums">
                    {activeDay.dayIndex}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <Input
                      className="font-display text-xl md:text-2xl border-0 bg-transparent focus-visible:ring-0 px-0 h-auto text-white placeholder:text-white/30"
                      value={activeDay.title}
                      onChange={(e) =>
                        updateDay(activeDay.dayIndex, (d) => ({ ...d, title: e.target.value }))
                      }
                      placeholder="Titolo della giornata..."
                    />
                    <p className="text-xs text-white/45 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-accent/60" />
                      {formatComposerDayLabel(activeDay.date, activeDay.dayIndex)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="composer-glass rounded-2xl p-4 shrink-0">
                <BlockPalette onAdd={addBlock} />
              </div>

              <div className="flex-1 overflow-y-auto space-y-0 min-h-[220px] max-h-[52vh] lg:max-h-none pr-1 composer-scroll">
                <AnimatePresence mode="popLayout">
                  {activeDay.blocks.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="composer-empty-day rounded-2xl p-12 text-center"
                    >
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                        className="text-5xl mb-4"
                      >
                        🗺️
                      </motion.div>
                      <p className="font-display text-xl font-semibold text-white">
                        La tua giornata è una tela bianca
                      </p>
                      <p className="text-sm text-white/45 mt-2 max-w-xs mx-auto leading-relaxed">
                        Aggiungi blocchi dal menu sopra, oppure clicca direttamente sulla mappa
                        per segnare una tappa.
                      </p>
                    </motion.div>
                  ) : (
                    activeDay.blocks.map((block, index) => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        index={index}
                        total={activeDay.blocks.length}
                        isHighlighted={highlightedPinId === block.id}
                        onEdit={() => {
                          setEditingBlock(block);
                          setHighlightedPinId(block.id);
                        }}
                        onMoveUp={() => moveBlock(index, -1)}
                        onMoveDown={() => moveBlock(index, 1)}
                        onHover={(hovering) =>
                          setHighlightedPinId(hovering ? block.id : null)
                        }
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className="composer-crew-hint rounded-2xl p-4 flex items-center gap-3 shrink-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15">
                  <MessageCircle className="h-4 w-4 text-accent" />
                </div>
                <p className="text-xs text-white/55 leading-relaxed">
                  Dopo il lancio si apre la{' '}
                  <strong className="text-white/80">chat crew</strong> — niente più thread
                  WhatsApp persi tra amici.
                </p>
              </div>
            </motion.div>
          )}

          {showMap && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex flex-col gap-3 min-h-[340px] lg:min-h-[calc(100vh-16rem)]"
            >
              <div className="composer-map-frame flex-1 flex flex-col min-h-[300px] lg:min-h-0">
                <TripMap
                  destination={draft.destination}
                  destinationMeta={draft.destinationMeta}
                  pins={pins}
                  activeDayIndex={activeDayIndex}
                  highlightedPinId={highlightedPinId}
                  className="flex-1 min-h-[300px] lg:min-h-0 border-0 rounded-2xl"
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
              <div className="flex items-center justify-center gap-4 text-[10px] text-white/35">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Giorno attivo
                </span>
                <span>·</span>
                <span>Clicca un pin per modificarlo</span>
                <span>·</span>
                <span>Clicca la mappa per aggiungere</span>
              </div>
            </motion.div>
          )}
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