'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { TripMap } from '@/components/maps/TripMap';
import { googleMapsItineraryUrl } from '@/lib/maps/google-maps-links';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import { createEmptyBlock } from '@/lib/composer/blocks';
import { DAY_TEMPLATES } from '@/lib/composer/day-templates';
import { duplicateBlock } from '@/lib/composer/planning';
import { formatComposerDayLabel } from '@/lib/composer/days';
import type { TimeSlot } from '@/lib/composer/time-slots';
import { BlockEditorPanel } from '@/components/composer/BlockEditorPanel';
import { BlockPalette } from '@/components/composer/plan/BlockPalette';
import { BudgetPanel } from '@/components/composer/plan/BudgetPanel';
import { ComposerPlanToolbar, type PlanViewMode } from '@/components/composer/plan/ComposerPlanToolbar';
import { DaySelector } from '@/components/composer/plan/DaySelector';
import { DayTimeline } from '@/components/composer/plan/DayTimeline';
import { DayToolsBar } from '@/components/composer/plan/DayToolsBar';
import { PlanStatsBar } from '@/components/composer/plan/PlanStatsBar';
import { SuggestDayButton } from '@/components/composer/plan/SuggestDayButton';
import {
  TravelSearchPanel,
  type ImportedFlightQuote,
} from '@/components/composer/plan/TravelSearchPanel';
import { WeatherStrip } from '@/components/composer/plan/WeatherStrip';
import type {
  ComposerBlock,
  ComposerBlockType,
  ComposerDay,
  ComposerDraft,
  ComposerGenerateResponse,
} from '@/types/composer';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>('morning');

  const activeDay = draft.days.find((d) => d.dayIndex === activeDayIndex) ?? draft.days[0];

  const pins = useMemo(
    () => buildPinsFromDraft(draft, { activeDayIndex }),
    [draft, activeDayIndex]
  );

  const googleMapsUrl = useMemo(() => googleMapsItineraryUrl(pins), [pins]);

  const updateDay = (dayIndex: number, updater: (day: ComposerDay) => ComposerDay) => {
    onChangeDays(draft.days.map((d) => (d.dayIndex === dayIndex ? updater(d) : d)));
  };

  const importFlightsToPlan = (quotes: ImportedFlightQuote[]) => {
    if (!activeDay || quotes.length === 0) return;

    let sortBase = activeDay.blocks.length;
    const newBlocks = quotes.map((quote) => {
      const block = createEmptyBlock('flight', sortBase, {
        title:
          quote.price != null && quote.price > 0
            ? `Volo ${quote.origin.iata} → ${quote.destinationIata || draft.destination}`
            : `Volo ${quote.origin.iata}`,
        origin: quote.origin.iata,
        originLabel: quote.origin.city,
        destination: quote.destinationIata || undefined,
        price: quote.price,
        currency: quote.currency,
        airline: quote.airline,
        affiliateUrl: quote.affiliateUrl,
        fromCache: quote.fromCache,
      });
      sortBase += 1;
      return block;
    });

    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      blocks: [...d.blocks, ...newBlocks],
    }));

    const last = newBlocks[newBlocks.length - 1];
    if (last) {
      setEditingBlock(last);
      setHighlightedPinId(last.id);
    }
  };

  const addBlock = (
    type: ComposerBlockType,
    extra?: Record<string, unknown>,
    timeSlot?: TimeSlot
  ) => {
    if (!activeDay) return;
    const block = createEmptyBlock(type, activeDay.blocks.length, {
      timeSlot: timeSlot ?? selectedSlot,
      ...extra,
    });
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

  const applyTemplate = (templateId: string) => {
    const template = DAY_TEMPLATES.find((t) => t.id === templateId);
    if (!template || !activeDay) return;

    const newBlocks = template.blocks.map((b, i) =>
      createEmptyBlock(b.type, activeDay.blocks.length + i, {
        title: b.title,
        timeSlot: b.timeSlot ?? 'flex',
      })
    );

    updateDay(activeDay.dayIndex, (d) => ({
      ...d,
      title: d.blocks.length === 0 ? template.label : d.title,
      blocks: [...d.blocks, ...newBlocks],
    }));
    toast.success(`Template "${template.label}" applicato`);
  };

  const duplicateDayBlocks = () => {
    const nextDay = draft.days.find((d) => d.dayIndex === activeDayIndex + 1);
    if (!activeDay || !nextDay) {
      toast.message('Nessun giorno successivo da riempire');
      return;
    }
    const copies = activeDay.blocks.map((b, i) =>
      duplicateBlock(b, nextDay.blocks.length + i)
    );
    updateDay(nextDay.dayIndex, (d) => ({
      ...d,
      blocks: [...d.blocks, ...copies],
    }));
    setActiveDayIndex(nextDay.dayIndex);
    toast.success(`Blocchi copiati nel giorno ${nextDay.dayIndex}`);
  };

  const clearDay = () => {
    if (!activeDay) return;
    updateDay(activeDay.dayIndex, (d) => ({ ...d, blocks: [] }));
    toast.message('Giornata svuotata');
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

  const totalBlocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);
  const showPlan = viewMode === 'split' || viewMode === 'plan';
  const showSidebar = viewMode === 'split' || viewMode === 'map';

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

      <div className="container mx-auto px-4 py-4 space-y-4">
        <PlanStatsBar days={draft.days} />
        <DaySelector
          days={draft.days}
          activeDayIndex={activeDayIndex}
          onSelect={setActiveDayIndex}
        />
      </div>

      <div className="flex-1 container mx-auto px-4 pb-8">
        <div
          className={`grid gap-6 h-full ${
            viewMode === 'split'
              ? 'xl:grid-cols-12'
              : viewMode === 'plan'
                ? 'grid-cols-1 max-w-3xl mx-auto'
                : 'grid-cols-1'
          }`}
        >
          {showPlan && activeDay && (
            <motion.div
              layout
              className={`flex flex-col gap-4 min-h-0 ${viewMode === 'split' ? 'xl:col-span-7' : ''}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="composer-day-header rounded-2xl p-5 shrink-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-xl font-bold text-accent tabular-nums shadow-lg shadow-accent/10">
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
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <SuggestDayButton
                      draft={draft}
                      activeDay={activeDay}
                      onApplied={applyGeneratedDay}
                    />
                    <DayToolsBar
                      blockCount={activeDay.blocks.length}
                      onApplyTemplate={applyTemplate}
                      onDuplicateDay={duplicateDayBlocks}
                      onClearDay={clearDay}
                    />
                  </div>
                </div>
              </div>

              <div className="composer-glass rounded-2xl p-4 shrink-0">
                <BlockPalette
                  selectedSlot={selectedSlot}
                  onSlotChange={setSelectedSlot}
                  onAdd={(type, slot) => addBlock(type, undefined, slot)}
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[240px] max-h-[58vh] xl:max-h-none pr-1 composer-scroll">
                {activeDay.blocks.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="composer-empty-day rounded-2xl p-12 text-center"
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                      className="text-6xl mb-5"
                    >
                      ✨
                    </motion.div>
                    <p className="font-display text-2xl font-semibold text-white">
                      Pianifica come i pro
                    </p>
                    <p className="text-sm text-white/45 mt-3 max-w-sm mx-auto leading-relaxed">
                      Tocca <strong className="text-white/70">Suggerisci giornata ✨</strong>{' '}
                      per itinerario Smart o Gemini AI, oppure usa template e
                      palette manuale.
                    </p>
                  </motion.div>
                ) : (
                  <DayTimeline
                    blocks={activeDay.blocks}
                    highlightedPinId={highlightedPinId}
                    onEdit={setEditingBlock}
                    onMoveUp={(i) => moveBlock(i, -1)}
                    onMoveDown={(i) => moveBlock(i, 1)}
                    onDuplicate={duplicateBlockInDay}
                    onHover={setHighlightedPinId}
                    onDragReorder={dragReorder}
                  />
                )}
              </div>
            </motion.div>
          )}

          {showSidebar && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className={`space-y-4 ${viewMode === 'split' ? 'xl:col-span-5' : ''} ${
                viewMode === 'split' ? 'xl:sticky xl:top-36 xl:self-start' : ''
              }`}
            >
              <TravelSearchPanel
                draft={draft}
                onImportFlights={importFlightsToPlan}
                onAddFlight={(origin) =>
                  addBlock(
                    'flight',
                    {
                      title: origin ? `Volo ${origin.iata}` : 'Volo',
                      origin: origin?.iata,
                      originLabel: origin?.city,
                    },
                    'morning'
                  )
                }
                onAddHotel={() => addBlock('hotel', { title: 'Hotel' }, 'night')}
              />

              <div className="composer-map-frame">
                <TripMap
                  destination={draft.destination}
                  destinationMeta={draft.destinationMeta}
                  pins={pins}
                  activeDayIndex={activeDayIndex}
                  highlightedPinId={highlightedPinId}
                  className="h-[220px] md:h-[260px] border-0 rounded-2xl"
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

              {googleMapsUrl && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl border-white/10 text-white/70 hover:bg-white/[0.06] h-9 text-xs"
                >
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Apri itinerario su Google Maps
                  </a>
                </Button>
              )}

              <WeatherStrip draft={draft} activeDayIndex={activeDayIndex} />
              <BudgetPanel days={draft.days} activeDayIndex={activeDayIndex} />
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