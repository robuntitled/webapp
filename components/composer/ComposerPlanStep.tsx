'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TripMap } from '@/components/maps/TripMap';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import {
  BLOCK_META,
  createEmptyBlock,
  getBlockDisplayPrice,
  getBlockDisplayTitle,
} from '@/lib/composer/blocks';
import { formatComposerDayLabel } from '@/lib/composer/days';
import { BlockEditorPanel } from '@/components/composer/BlockEditorPanel';
import type { ComposerBlock, ComposerBlockType, ComposerDay, ComposerDraft } from '@/types/composer';
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  LayoutGrid,
  Map as MapIcon,
  MessageCircle,
  Pencil,
  Plus,
} from 'lucide-react';

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

type ViewMode = 'split' | 'plan' | 'map';

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
  const [viewMode, setViewMode] = useState<ViewMode>('plan');

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

  const totalBlocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);

  const viewButtons = [
    { id: 'split' as const, label: 'Split', icon: LayoutGrid, hideMobile: true },
    { id: 'plan' as const, label: 'Piano', icon: GripVertical },
    { id: 'map' as const, label: 'Mappa', icon: MapIcon },
  ];

  const showPlan = viewMode === 'split' || viewMode === 'plan';
  const showMap = viewMode === 'split' || viewMode === 'map';

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="sticky top-16 z-30 composer-glass border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="rounded-full text-white/80 shrink-0"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Meta
          </Button>

          <div className="flex rounded-full bg-white/10 p-0.5 gap-0.5">
            {viewButtons.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition md:px-4 ${
                  v.hideMobile ? 'hidden lg:flex' : 'flex'
                } ${
                  viewMode === v.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>

          <Button type="button" size="sm" className="rounded-full shrink-0" onClick={onReview} disabled={totalBlocks === 0}>
            Rivedi
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="container mx-auto px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {draft.days.map((day) => (
              <button
                key={day.dayIndex}
                type="button"
                onClick={() => setActiveDayIndex(day.dayIndex)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
                  day.dayIndex === activeDayIndex
                    ? 'bg-accent text-accent-foreground shadow-md'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                Giorno {day.dayIndex}
                {day.blocks.length > 0 && (
                  <span className="ml-1.5 opacity-70">· {day.blocks.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-5">
        <div
          className={`grid gap-5 h-full ${
            viewMode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {showPlan && (
            <motion.div
              layout
              className="space-y-4 min-h-0 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {activeDay && (
                <>
                  <div className="composer-glass rounded-2xl p-4 shrink-0">
                    <Input
                      className="font-display text-lg border-0 bg-transparent focus-visible:ring-0 px-0 text-white"
                      value={activeDay.title}
                      onChange={(e) =>
                        updateDay(activeDay.dayIndex, (d) => ({ ...d, title: e.target.value }))
                      }
                    />
                    <p className="text-xs text-white/50">
                      {formatComposerDayLabel(activeDay.date, activeDay.dayIndex)}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 shrink-0">
                    {PALETTE_TYPES.map((type) => {
                      const meta = BLOCK_META[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addBlock(type)}
                          className="composer-glass rounded-xl p-2.5 text-center hover:bg-accent/15 hover:border-accent/30 border border-transparent transition group"
                          title={meta.hint}
                        >
                          <span className="text-xl block group-hover:scale-110 transition-transform">
                            {meta.emoji}
                          </span>
                          <span className="text-[10px] text-white/60 mt-1 block truncate">
                            {meta.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[50vh] lg:max-h-none pr-1">
                    <AnimatePresence mode="popLayout">
                      {activeDay.blocks.length === 0 ? (
                        <motion.div
                          key="empty"
                          className="composer-glass rounded-2xl border-2 border-dashed border-white/20 p-10 text-center"
                        >
                          <p className="text-3xl mb-2">🗺️</p>
                          <p className="text-white font-medium">Aggiungi blocchi o clicca sulla mappa</p>
                          <p className="text-xs text-white/50 mt-2">
                            Ogni tappa apparirà sulla mappa in tempo reale
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
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              onMouseEnter={() => setHighlightedPinId(block.id)}
                              onMouseLeave={() => setHighlightedPinId(null)}
                              className={`composer-block rounded-2xl border bg-gradient-to-br ${meta.color} p-4 cursor-pointer`}
                              onClick={() => {
                                setEditingBlock(block);
                                setHighlightedPinId(block.id);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-lg">{meta.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {meta.label}
                                  </p>
                                  <p className="font-semibold truncate">{getBlockDisplayTitle(block)}</p>
                                  {price != null && (
                                    <p className="text-sm font-bold text-primary tabular-nums">{price}€</p>
                                  )}
                                </div>
                                <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
                              </div>
                              <div className="flex gap-1 mt-2 ml-8" onClick={(e) => e.stopPropagation()}>
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
                  </div>

                  <div className="composer-glass rounded-xl p-3 flex items-center gap-3 shrink-0">
                    <MessageCircle className="h-4 w-4 text-accent shrink-0" />
                    <p className="text-xs text-white/60">
                      Dopo il lancio la <strong className="text-white/80">chat crew</strong> si apre qui —
                      niente più thread WhatsApp persi.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {showMap && (
            <motion.div layout className="flex flex-col gap-3 min-h-[320px] lg:min-h-[calc(100vh-14rem)]">
              <TripMap
                destination={draft.destination}
                pins={pins}
                activeDayIndex={activeDayIndex}
                highlightedPinId={highlightedPinId}
                className="flex-1 min-h-[300px] lg:min-h-0"
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
              <p className="text-[11px] text-white/45 text-center px-2">
                I colori indicano il giorno · Clicca un pin per modificarlo
              </p>
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