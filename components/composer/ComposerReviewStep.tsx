'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BLOCK_META, getBlockDisplayPrice, getBlockDisplayTitle } from '@/lib/composer/blocks';
import { estimateTripBudget, formatComposerDayLabel } from '@/lib/composer/days';
import type { ComposerDraft } from '@/types/composer';
import { TripMap } from '@/components/maps/TripMap';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import { validatePublishDraft } from '@/lib/composer/publish-validation';
import { ChevronLeft, Loader2, Rocket } from 'lucide-react';

type ComposerReviewStepProps = {
  draft: ComposerDraft;
  publishing: boolean;
  onBack: () => void;
  onPublish: () => void;
};

export function ComposerReviewStep({
  draft,
  publishing,
  onBack,
  onPublish,
}: ComposerReviewStepProps) {
  const budget = estimateTripBudget(draft.days);
  const blockCount = draft.days.reduce((n, d) => n + d.blocks.length, 0);
  const pins = buildPinsFromDraft(draft);
  const publishIssues = validatePublishDraft(draft);
  const canPublish = publishIssues.length === 0;

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0f1a]/95 backdrop-blur-xl px-4 py-4">
        <div className="container mx-auto max-w-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-accent text-xs uppercase tracking-widest font-medium">
              Step 3 di 3 · Pubblica
            </p>
            <h2 className="font-display text-lg md:text-xl font-semibold text-white truncate">
              {draft.title}
            </h2>
            <p className="text-xs text-white/55 mt-0.5">
              {draft.days.length} giorni · {blockCount} tappe · ~{budget}€/persona
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={onBack}
              disabled={publishing}
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Modifica
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full gap-1.5 min-w-[140px] bg-gradient-to-r from-violet-600 to-orange-500 text-white"
              onClick={onPublish}
              disabled={publishing || !canPublish}
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {publishing ? 'Lancio…' : 'Lancia viaggio'}
            </Button>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8 pb-16 max-w-3xl space-y-6 flex-1"
      >
        {publishIssues.length > 0 && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 space-y-1">
            {publishIssues.map((issue) => (
              <p key={issue.code} className="text-sm text-amber-100/90">
                {issue.message}
              </p>
            ))}
          </div>
        )}

        {pins.length > 0 && (
          <TripMap
            destination={draft.destination}
            destinationMeta={draft.destinationMeta}
            pins={pins}
            className="h-[220px] md:h-[260px] rounded-2xl overflow-hidden border border-white/10"
            interactive={false}
            showRoute={false}
          />
        )}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] overflow-hidden shadow-xl">
          {draft.days.map((day, idx) => (
            <div
              key={day.dayIndex}
              className={`p-5 ${idx > 0 ? 'border-t border-white/10' : ''}`}
            >
              <p className="font-display font-semibold text-lg text-white">{day.title}</p>
              <p className="text-xs text-white/50 mb-3">
                {formatComposerDayLabel(day.date, day.dayIndex)}
              </p>
              {day.blocks.length === 0 ? (
                <p className="text-sm text-white/40 italic">Nessuna tappa</p>
              ) : (
                <ul className="space-y-2">
                  {day.blocks.map((block) => {
                    const meta = BLOCK_META[block.type];
                    const price = getBlockDisplayPrice(block);
                    return (
                      <li
                        key={block.id}
                        className="flex items-center justify-between gap-3 text-sm rounded-xl bg-white/[0.06] border border-white/8 px-3 py-2.5"
                      >
                        <span className="text-white/90">
                          {meta.emoji} {getBlockDisplayTitle(block)}
                        </span>
                        <span className="font-medium tabular-nums text-white/70 shrink-0">
                          {price != null ? `${price}€` : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}