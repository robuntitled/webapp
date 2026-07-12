'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { requestDayGeneration } from '@/lib/composer/client-generate';
import type { ComposerDay, ComposerDraft, ComposerGenerateResponse } from '@/types/composer';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

type SuggestDayButtonProps = {
  draft: ComposerDraft;
  activeDay: ComposerDay;
  onApplied: (response: ComposerGenerateResponse, mode: 'replace' | 'append') => void;
};

export function SuggestDayButton({ draft, activeDay, onApplied }: SuggestDayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const hasBlocks = activeDay.blocks.length > 0;
      const otherDaysSummary = draft.days
        .filter((d) => d.dayIndex !== activeDay.dayIndex && d.blocks.length > 0)
        .map((d) => `G${d.dayIndex}: ${d.blocks.map((b) => b.content.title).join(', ')}`)
        .join('; ');

      const response = await requestDayGeneration({
        destination: draft.destination,
        destinationMeta: draft.destinationMeta,
        dayIndex: activeDay.dayIndex,
        date: activeDay.date,
        dayTitle: activeDay.title,
        startDate: draft.startDate,
        endDate: draft.endDate,
        planningMode: draft.planningMode,
        maxParticipants: draft.maxParticipants,
        intent: hasBlocks ? 'add_alternatives' : 'suggest_day',
        currentDayBlocks: hasBlocks ? activeDay.blocks : undefined,
        otherDaysSummary: otherDaysSummary || undefined,
      });

      onApplied(response, hasBlocks ? 'append' : 'replace');

      const sourceLabel =
        response.meta.source === 'mock'
          ? 'suggerimenti smart (preview)'
          : response.meta.source;

      toast.success(
        `${response.blocks.length} blocchi generati · ${sourceLabel} · ${response.meta.latencyMs}ms`
      );

      if (response.warnings.length > 0) {
        toast.message(response.warnings[0], { duration: 4000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        disabled={loading}
        onClick={() => void handleSuggest()}
        className="rounded-full h-9 px-4 bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 text-white font-semibold shadow-lg shadow-accent/25 border-0"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Suggerisci giornata
      </Button>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-full right-0 mt-2 z-20 w-56 rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl p-3 shadow-xl"
          >
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Wand2 className="h-3.5 w-3.5 text-accent animate-pulse" />
              Orchestrator in corso...
            </div>
            <div className="mt-2 space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-2 rounded-full bg-white/10 animate-pulse"
                  style={{ width: `${90 - i * 15}%`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}