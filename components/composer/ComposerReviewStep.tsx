'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BLOCK_META, getBlockDisplayPrice, getBlockDisplayTitle } from '@/lib/composer/blocks';
import { estimateTripBudget, formatComposerDayLabel } from '@/lib/composer/days';
import type { ComposerDraft } from '@/types/composer';
import { TripMap } from '@/components/maps/TripMap';
import { buildPinsFromDraft } from '@/lib/maps/pins';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8 pb-28 max-w-3xl space-y-8"
    >
      <div className="text-center space-y-3">
        <p className="text-accent text-sm uppercase tracking-widest font-medium">Step 3 di 3 · Pubblica</p>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-white">
          Pronto a lanciare &quot;{draft.title}&quot;?
        </h2>
        <p className="text-white/65">
          {draft.days.length} giorni · {blockCount} blocchi · budget stimato{' '}
          <span className="text-accent font-bold">{budget}€</span>/persona
        </p>
      </div>

      {pins.length > 0 && (
        <TripMap
          destination={draft.destination}
          pins={pins}
          className="h-[240px] md:h-[280px]"
          interactive={false}
        />
      )}

      <Card className="composer-glass border-0 rounded-3xl overflow-hidden">
        <CardContent className="p-0 divide-y divide-border/50">
          {draft.days.map((day) => (
            <div key={day.dayIndex} className="p-5">
              <p className="font-display font-semibold text-lg">{day.title}</p>
              <p className="text-xs text-muted-foreground mb-3">
                {formatComposerDayLabel(day.date, day.dayIndex)}
              </p>
              {day.blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nessun blocco</p>
              ) : (
                <ul className="space-y-2">
                  {day.blocks.map((block) => {
                    const meta = BLOCK_META[block.type];
                    const price = getBlockDisplayPrice(block);
                    return (
                      <li
                        key={block.id}
                        className="flex items-center justify-between gap-3 text-sm rounded-xl bg-muted/40 px-3 py-2"
                      >
                        <span>
                          {meta.emoji} {getBlockDisplayTitle(block)}
                        </span>
                        <span className="font-medium tabular-nums shrink-0">
                          {price != null ? `${price}€` : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={onBack}
          disabled={publishing}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Torna a comporre
        </Button>
        <Button
          type="button"
          size="lg"
          className="rounded-full gap-2 min-w-[200px]"
          onClick={onPublish}
          disabled={publishing}
        >
          {publishing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Rocket className="h-5 w-5" />
          )}
          {publishing ? 'Lancio in corso...' : 'Lancia il viaggio 🚀'}
        </Button>
      </div>
    </motion.div>
  );
}