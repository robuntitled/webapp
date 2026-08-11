'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { discardComposerDraft } from '@/actions/composer-draft';
import { summarizeComposerDraftWithStep } from '@/lib/composer/draft-utils';
import { clearComposerLocalSession } from '@/lib/composer/local-draft';
import type { ComposerWizardStep } from '@/lib/composer/wizard-steps';
import type { ComposerDraft } from '@/types/composer';
import { BookOpen, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type ComposerDraftCardProps = {
  draft: Partial<ComposerDraft>;
  currentStep: ComposerWizardStep;
  updatedAt: string | null;
};

export function ComposerDraftCard({ draft, currentStep, updatedAt }: ComposerDraftCardProps) {
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);

  if (removed) return null;

  const summary = summarizeComposerDraftWithStep(draft, currentStep);
  const updatedLabel = updatedAt
    ? formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: it })
    : null;

  const handleDiscard = () => {
    startTransition(async () => {
      try {
        await discardComposerDraft();
        clearComposerLocalSession();
        setRemoved(true);
        toast.message('Bozza eliminata');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore eliminazione');
      }
    });
  };

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 backdrop-blur-sm p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20">
        <BookOpen className="h-6 w-6 text-amber-200" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/70">
          Bozza in corso · {summary.stepLabel}
        </p>
        <h3 className="font-display text-xl font-semibold text-white truncate">
          {draft.title?.trim() || summary.destinationLabel}
        </h3>
        <p className="text-sm text-white/65">
          {summary.destinationLabel}
          {summary.dateRange ? ` · ${summary.dateRange}` : ''}
          {summary.dayCount > 0
            ? ` · ${summary.dayCount} ${summary.dayCount === 1 ? 'giorno' : 'giorni'}`
            : ''}
          {summary.blockCount > 0 ? ` · ${summary.blockCount} tappe` : ''}
        </p>
        {updatedLabel && (
          <p className="text-xs text-white/40">Aggiornata {updatedLabel}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <Button asChild className="rounded-full gap-2">
          <Link href="/organizza?resume=1">
            <Pencil className="h-4 w-4" />
            Riprendi bozza
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          disabled={pending}
          onClick={handleDiscard}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </>
          )}
        </Button>
      </div>
    </div>
  );
}