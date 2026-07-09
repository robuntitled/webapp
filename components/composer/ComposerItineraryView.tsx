import { Card, CardContent } from '@/components/ui/card';
import { BLOCK_META } from '@/lib/composer/blocks';
import { formatComposerDayLabel } from '@/lib/composer/days';
import type { ComposerDayRow } from '@/lib/data/composer';

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

export function ComposerItineraryView({ days }: ComposerItineraryViewProps) {
  if (!days.length) return null;

  return (
    <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <h2 className="font-display text-2xl font-semibold">Itinerario giorno per giorno</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Composito su NomadLink — voli, hotel e attività con alternative.
          </p>
        </div>
        <div className="divide-y">
          {days.map((day) => (
            <div key={day.id} className="p-6">
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <div>
                  <p className="font-display text-lg font-semibold">
                    {day.title ?? `Giorno ${day.day_index}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatComposerDayLabel(day.day_date, day.day_index)}
                  </p>
                </div>
                <span className="text-2xl font-bold text-primary/30 tabular-nums">
                  {String(day.day_index).padStart(2, '0')}
                </span>
              </div>
              {day.trip_blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Giornata libera</p>
              ) : (
                <ul className="space-y-2">
                  {[...day.trip_blocks]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((block) => {
                      const meta = BLOCK_META[block.block_type as keyof typeof BLOCK_META];
                      const price = blockPrice(block.content);
                      return (
                        <li
                          key={block.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-r ${meta?.color ?? ''} px-4 py-3`}
                        >
                          <span className="text-sm font-medium">
                            {meta?.emoji} {blockTitle(block.content, block.block_type)}
                          </span>
                          {price != null && (
                            <span className="text-sm font-bold text-primary tabular-nums shrink-0">
                              {price}€
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}