'use client';

import { Moon, Sun, Sunset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ItineraryTemplate } from '@/lib/itineraries/types';

const SLOT_META: Record<
  'morning' | 'afternoon' | 'evening',
  { label: string; Icon: LucideIcon }
> = {
  morning: { label: 'Mattina', Icon: Sun },
  afternoon: { label: 'Pomeriggio', Icon: Sunset },
  evening: { label: 'Sera', Icon: Moon },
};

type Slot = keyof typeof SLOT_META;

function slotsForDay(template: ItineraryTemplate, dayNumber: number) {
  const day = template.days.find((d) => d.day_number === dayNumber);
  const acts = template.paid_activities.filter((a) => a.day_number === dayNumber);
  const bySlot: Record<Slot, string[]> = {
    morning: acts.filter((a) => a.slot === 'morning').map((a) => a.title),
    afternoon: acts.filter((a) => a.slot === 'afternoon').map((a) => a.title),
    evening: acts.filter((a) => a.slot === 'evening').map((a) => a.title),
  };

  if (acts.length === 0 && day) {
    const pois = day.pois.map((p) => p.name);
    bySlot.morning = pois.slice(0, 2);
    bySlot.afternoon = pois.slice(2, 4);
    bySlot.evening = pois.slice(4);
    if (!pois.length) {
      bySlot.morning = [day.description];
    }
  }

  return { day, bySlot };
}

export function ItineraryScrollWidget({
  template,
}: {
  template: ItineraryTemplate;
}) {
  return (
    <section
      className="ws-widget flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl"
      aria-label="Itinerario giorno per giorno"
    >
      <header className="shrink-0 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
          Itinerario
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {template.duration_days} giorni · {template.destination_name}
        </p>
      </header>
      <div className="ws-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <ol className="space-y-0">
          {template.days.map((day, index) => {
            const { bySlot } = slotsForDay(template, day.day_number);
            const isLast = index === template.days.length - 1;
            const slotEntries = (Object.keys(SLOT_META) as Slot[]).filter(
              (slot) => bySlot[slot].length > 0
            );

            return (
              <li key={day.day_number} className="relative flex gap-4 pb-8 last:pb-2">
                {!isLast ? (
                  <div
                    className="absolute left-[15px] top-9 bottom-0 w-px bg-gradient-to-b from-primary/25 via-slate-200/80 to-transparent"
                    aria-hidden
                  />
                ) : null}
                <div
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm ring-4 ring-white"
                  aria-hidden
                >
                  {day.day_number}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {day.title}
                    </h3>
                    {day.area_segment ? (
                      <span className="text-xs font-medium text-slate-400">
                        · {day.area_segment}
                      </span>
                    ) : null}
                  </div>
                  {slotEntries.length > 0 ? (
                    <div className="mt-3 space-y-2.5">
                      {slotEntries.map((slot) => {
                        const { label, Icon } = SLOT_META[slot];
                        const items = bySlot[slot];
                        return (
                          <div key={slot}>
                            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                              <Icon className="h-3 w-3" aria-hidden />
                              {label}
                            </p>
                            <ul className="flex flex-wrap gap-1.5">
                              {items.map((item) => (
                                <li
                                  key={item}
                                  className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-sm text-slate-700 shadow-sm"
                                >
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function WorkspaceEmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 text-sm font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-md"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
