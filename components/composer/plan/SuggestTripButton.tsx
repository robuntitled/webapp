'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  requestTripGeneration,
  VagueDestinationClientError,
} from '@/lib/composer/client-generate';
import {
  checkDestinationPlannable,
  resolveDestinationContext,
} from '@/lib/composer/destination-context';
import { MAX_TRIP_DAYS } from '@/lib/composer/trip-limits';
import type {
  ComposerDraft,
  ComposerJobProgress,
  ComposerTripGenerateResponse,
} from '@/types/composer';
import { Loader2, Route, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

type SuggestTripButtonProps = {
  draft: ComposerDraft;
  onApplied: (response: ComposerTripGenerateResponse) => void;
};

function sourceLabel(response: ComposerTripGenerateResponse): string {
  const model = response.meta.model?.replace(/^(gemini-|llama)/, '') ?? '';
  if (response.meta.source === 'ai') return `AI ${model}`.trim();
  if (response.meta.source === 'cache') return `AI ${model} (cache)`.trim();
  return 'Smart locale';
}

function enrichmentLabel(response: ComposerTripGenerateResponse): string {
  const parts: string[] = [];
  if (response.meta.enrichment.flights) parts.push('voli reali');
  if (response.meta.enrichment.hotels) parts.push('hotel reali');
  if (response.meta.enrichment.activities) parts.push('luoghi reali');
  return parts.length > 0 ? parts.join(' · ') : 'senza tariffe live';
}

export function SuggestTripButton({ draft, onApplied }: SuggestTripButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ComposerJobProgress | null>(null);

  const destination = useMemo(
    () => resolveDestinationContext(draft.destination, draft.destinationMeta),
    [draft.destination, draft.destinationMeta]
  );

  const handleSuggest = async () => {
    const check = checkDestinationPlannable(destination);
    if (!check.ok) {
      toast.error(check.message, { duration: 7000 });
      return;
    }
    if (draft.days.length > MAX_TRIP_DAYS) {
      toast.error(
        `Massimo ${MAX_TRIP_DAYS} giorni per generazione: riduci le giornate o compila il resto a mano.`
      );
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: 3, label: 'Preparo il viaggio…' });

    try {
      const response = await requestTripGeneration(
        {
          destination: draft.destination,
          destinationMeta: draft.destinationMeta,
          startDate: draft.startDate,
          endDate: draft.endDate,
          days: draft.days.map((d) => ({
            dayIndex: d.dayIndex,
            date: d.date,
            title: d.title || undefined,
          })),
          planningMode: draft.planningMode,
          maxParticipants: draft.maxParticipants,
          organizerOrigin: draft.organizerOrigin,
          crewOrigins: draft.crewOrigins,
          plannerProfile: draft.plannerProfile,
          roundtrip: draft.days.length > 1,
        },
        setProgress
      );

      onApplied(response);

      toast.success(
        `${response.meta.daysFilled}/${draft.days.length} giorni · ${response.meta.blocksTotal} tappe · ${sourceLabel(response)} · ${enrichmentLabel(response)}`,
        { duration: 6000 }
      );

      if (response.warnings.length > 0) {
        toast.message(response.warnings[0], { duration: 6000 });
      }
    } catch (err) {
      if (err instanceof VagueDestinationClientError) {
        toast.error(err.message, { duration: 8000 });
      } else {
        toast.error(err instanceof Error ? err.message : 'Errore generazione itinerario');
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const percent = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 8;

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={loading}
        onClick={() => void handleSuggest()}
        className="h-11 rounded-xl border-0 bg-gradient-to-r from-violet-600 to-orange-500 px-4 font-semibold text-white shadow-lg shadow-orange-500/20 hover:brightness-110"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Suggerisci viaggio
      </Button>

      <Dialog open={loading} onOpenChange={() => undefined}>
        <DialogContent
          showCloseButton={false}
          className="max-w-sm rounded-2xl border-white/10 bg-slate-950/95 text-white shadow-2xl shadow-accent/10 backdrop-blur-xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Generazione itinerario in corso</DialogTitle>
          <DialogDescription className="sr-only">
            Stiamo costruendo l&apos;itinerario completo per {destination.cityLabel}.
          </DialogDescription>

          <div className="flex flex-col items-center gap-5 py-2 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-gradient-to-br from-accent/30 to-orange-500/20">
                <Route className="h-7 w-7 animate-pulse text-accent" />
              </span>
            </div>

            <div className="min-h-[3.5rem] space-y-1.5">
              <p className="text-sm font-semibold text-white/90">
                Costruisco l&apos;itinerario completo…
              </p>
              <p className="text-xs text-white/55">
                {progress?.label ?? 'Preparo il viaggio…'}
              </p>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-orange-400"
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            <p className="text-[11px] text-white/40">
              {draft.days.length} {draft.days.length === 1 ? 'giorno' : 'giorni'} ·{' '}
              {destination.cityLabel}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
