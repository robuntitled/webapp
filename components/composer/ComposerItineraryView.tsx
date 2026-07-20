'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { BLOCK_META } from '@/lib/composer/blocks';
import { formatComposerDayLabel } from '@/lib/composer/days';
import type { ComposerDayRow } from '@/lib/data/composer';
import { cn } from '@/lib/utils';

type ComposerItineraryViewProps = {
  days: ComposerDayRow[];
};

function blockTitle(content: Record<string, unknown>, type: string): string {
  const altId = content.selectedAlternativeId;
  const alts = content.alternatives as { id: string; label: string }[] | undefined;
  if (altId && Array.isArray(alts)) {
    const alt = alts.find((a) => a.id === altId);
    if (alt?.label) return alt.label;
  }
  if (typeof content.title === 'string' && content.title) return content.title;
  const meta = BLOCK_META[type as keyof typeof BLOCK_META];
  return meta?.label ?? type;
}

function blockPrice(content: Record<string, unknown>): number | null {
  const altId = content.selectedAlternativeId;
  const alts = content.alternatives as { id: string; price?: number }[] | undefined;
  if (altId && Array.isArray(alts)) {
    const alt = alts.find((a) => a.id === altId);
    if (alt?.price != null) return alt.price;
  }
  return typeof content.price === 'number' ? content.price : null;
}

function dayPreview(day: ComposerDayRow): string {
  const blocks = [...day.trip_blocks].sort((a, b) => a.sort_order - b.sort_order);
  if (!blocks.length) return 'Giornata libera';
  const labels = blocks
    .slice(0, 2)
    .map((b) => blockTitle(b.content, b.block_type));
  const extra = blocks.length > 2 ? ` +${blocks.length - 2}` : '';
  return `${labels.join(' · ')}${extra}`;
}

export function ComposerItineraryView({ days }: ComposerItineraryViewProps) {
  const [openDayId, setOpenDayId] = useState<string | null>(null);

  if (!days.length) return null;

  const toggle = (id: string) => {
    setOpenDayId((prev) => (prev === id ? null : id));
  };

  return (
    <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-accent/5 sm:px-5">
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            Itinerario giorno per giorno
          </h2>
        </div>

        <ul className="divide-y">
          {days.map((day) => {
            const open = openDayId === day.id;
            const blocks = [...day.trip_blocks].sort(
              (a, b) => a.sort_order - b.sort_order
            );
            const count = blocks.length;

            return (
              <li key={day.id}>
                <button
                  type="button"
                  onClick={() => toggle(day.id)}
                  aria-expanded={open}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors sm:px-5',
                    open ? 'bg-muted/40' : 'hover:bg-muted/25'
                  )}
                >
                  <span className="w-7 shrink-0 text-center font-display text-sm font-semibold tabular-nums text-primary/50">
                    {String(day.day_index).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {day.title ?? `Giorno ${day.day_index}`}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatComposerDayLabel(day.day_date, day.day_index)}
                      {!open && (
                        <>
                          {' · '}
                          {dayPreview(day)}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {count === 0 ? '—' : `${count}`}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      open && 'rotate-180'
                    )}
                  />
                </button>

                {open && (
                  <div className="border-t border-border/50 bg-background px-4 pb-3 pt-1 sm:px-5 sm:pl-14">
                    {blocks.length === 0 ? (
                      <p className="py-2 text-sm italic text-muted-foreground">
                        Giornata libera
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {blocks.map((block) => {
                          const meta =
                            BLOCK_META[block.block_type as keyof typeof BLOCK_META];
                          const price = blockPrice(block.content);
                          return (
                            <li
                              key={block.id}
                              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/30"
                            >
                              <span className="min-w-0 truncate">
                                <span className="mr-1.5 opacity-70">
                                  {meta?.emoji ?? '•'}
                                </span>
                                {blockTitle(block.content, block.block_type)}
                              </span>
                              {price != null && (
                                <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                                  {price}€
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
