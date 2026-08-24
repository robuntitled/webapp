'use client';

import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'flight', label: 'Volo' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'sights', label: 'Attività' },
] as const;

export type TripProgressPhase = (typeof STEPS)[number]['id'];

export function TripBookingProgress({
  phase,
  hotelDetail,
}: {
  phase: TripProgressPhase;
  hotelDetail?: string | null;
}) {
  const phaseIdx = STEPS.findIndex((s) => s.id === phase);

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Il tuo viaggio in 3 passi
      </p>
      <ol className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
        {STEPS.map((step, i) => {
          const done = i < phaseIdx;
          const active = i === phaseIdx;
          return (
            <li key={step.id} className="flex items-center gap-2">
              {i > 0 ? (
                <span className="hidden h-px w-4 bg-border sm:block" aria-hidden />
              ) : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                  done && 'bg-emerald-100 text-emerald-800',
                  active && 'bg-accent text-[#0b1220]',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className={cn('h-3 w-3', active && 'fill-current')} />
                )}
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
      {hotelDetail ? (
        <p className="mt-2 text-xs text-muted-foreground">{hotelDetail}</p>
      ) : null}
    </div>
  );
}
