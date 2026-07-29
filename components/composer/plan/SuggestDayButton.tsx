'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { requestDayGeneration } from '@/lib/composer/client-generate';
import type { ComposerDay, ComposerDraft, ComposerGenerateResponse, ComposerGenerateSource } from '@/types/composer';
import { Loader2, Plus, Sparkles, Zap, Brain } from 'lucide-react';
import { toast } from 'sonner';

type SuggestDayButtonProps = {
  draft: ComposerDraft;
  activeDay: ComposerDay;
  onApplied: (response: ComposerGenerateResponse, mode: 'replace' | 'append') => void;
};

const THINKING_STEPS = [
  'Analizzo la destinazione…',
  'Studio il contesto del viaggio…',
  'Costruisco attività e orari…',
  'Quasi pronto…',
];

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

type SuggestMode = 'replace' | 'append';

export function SuggestDayButton({ draft, activeDay, onApplied }: SuggestDayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<SuggestMode>('replace');
  const [thinkingStep, setThinkingStep] = useState(0);
  const [lastSource, setLastSource] = useState<ComposerGenerateSource | null>(null);

  useEffect(() => {
    if (!loading) {
      setThinkingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setThinkingStep((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [loading]);

  const handleSuggest = async (mode: SuggestMode) => {
    setActiveMode(mode);
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
        plannerProfile: draft.plannerProfile,
        intent: mode === 'append' ? 'add_alternatives' : 'suggest_day',
        currentDayBlocks: mode === 'append' ? activeDay.blocks : undefined,
        targetBlockTypes:
          mode === 'append' ? ['attraction', 'activity', 'meal'] : undefined,
        otherDaysSummary: otherDaysSummary || undefined,
      });

      onApplied(response, mode);
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
  const destLabel = draft.destinationMeta?.label ?? draft.destination.split(',')[0]?.trim();
  const hasBlocks = activeDay.blocks.length > 0;

  return (
    <>
      <div className="relative flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={loading}
          onClick={() => void handleSuggest('replace')}
          className="h-11 rounded-xl px-4 bg-gradient-to-r from-violet-600 to-orange-500 hover:brightness-110 text-white font-semibold shadow-lg shadow-orange-500/20 border-0"
        >
          {loading && activeMode === 'replace' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Suggerisci giornata
        </Button>

        {hasBlocks && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void handleSuggest('append')}
            className="h-11 rounded-xl px-3.5 border-white/15 bg-white/5 text-white hover:bg-white/10 font-medium"
          >
            {loading && activeMode === 'append' ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            Aggiungi attività AI
          </Button>
        )}

        {badge && !loading && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
          >
            <badge.Icon className="h-3 w-3" />
            {badge.label}
          </span>
        )}
      </div>

      <Dialog open={loading} onOpenChange={() => undefined}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm rounded-2xl border-white/10 bg-slate-950/95 backdrop-blur-xl text-white shadow-2xl shadow-accent/10"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Generazione giornata in corso</DialogTitle>
          <DialogDescription className="sr-only">
            Stiamo preparando un suggerimento per la giornata {activeDay.dayIndex} a {destLabel}.
          </DialogDescription>

          <div className="flex flex-col items-center gap-5 py-2 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-orange-500/20 border border-accent/30">
                <Brain className="h-7 w-7 text-accent animate-pulse" />
              </span>
            </div>

            <div className="space-y-1.5 min-h-[3.5rem]">
              <p className="text-sm font-semibold text-white/90">Sto pensando…</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={thinkingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs text-white/55"
                >
                  {THINKING_STEPS[thinkingStep]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="w-full space-y-2 pt-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full bg-white/10 overflow-hidden"
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-orange-400"
                    initial={{ width: '0%' }}
                    animate={{ width: ['20%', '85%', '40%'] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
              ))}
            </div>

            <p className="text-[11px] text-white/40">
              Giorno {activeDay.dayIndex} · {destLabel}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
