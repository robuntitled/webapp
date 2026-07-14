'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { requestDayGeneration } from '@/lib/composer/client-generate';
import type { ComposerDay, ComposerDraft, ComposerGenerateResponse, ComposerGenerateSource } from '@/types/composer';
import { Loader2, Sparkles, Wand2, Zap, Brain } from 'lucide-react';
import { toast } from 'sonner';

type SuggestDayButtonProps = {
  draft: ComposerDraft;
  activeDay: ComposerDay;
  onApplied: (response: ComposerGenerateResponse, mode: 'replace' | 'append') => void;
};

function sourceBadge(source: ComposerGenerateSource | null): {
  label: string;
  className: string;
  Icon: typeof Sparkles;
} | null {
  if (!source) return null;
  if (source === 'ai') {
    return {
      label: 'AI',
      className: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
      Icon: Brain,
    };
  }
  if (source === 'cache') {
    return {
      label: 'AI cache',
      className: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
      Icon: Zap,
    };
  }
  return {
    label: 'Smart',
    className: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
    Icon: Sparkles,
  };
}

export function SuggestDayButton({ draft, activeDay, onApplied }: SuggestDayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastSource, setLastSource] = useState<ComposerGenerateSource | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    try {
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
        organizerOrigin: draft.organizerOrigin,
        crewOrigins: draft.crewOrigins,
        intent: 'suggest_day',
        otherDaysSummary: otherDaysSummary || undefined,
      });

      onApplied(response, 'replace');
      setLastSource(response.meta.source);

      const modelLabel = response.meta.model?.replace(/^(gemini-|llama)/, '') ?? '';
      const sourceLabel =
        response.meta.source === 'ai'
          ? `AI ${modelLabel}`.trim()
          : response.meta.source === 'cache'
            ? `AI ${modelLabel} (cache)`.trim()
            : 'Smart locale';

      toast.success(
        `${response.blocks.length} blocchi · ${sourceLabel} · ${response.meta.latencyMs}ms`
      );

      if (response.warnings.length > 0) {
        toast.message(response.warnings[0], { duration: 5000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione');
    } finally {
      setLoading(false);
    }
  };

  const badge = sourceBadge(lastSource);

  return (
    <div className="relative flex items-center gap-2">
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

      {badge && !loading && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
        >
          <badge.Icon className="h-3 w-3" />
          {badge.label}
        </span>
      )}

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
              Pianificazione in corso...
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