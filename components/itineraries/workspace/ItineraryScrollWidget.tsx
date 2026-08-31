'use client';

import type { ItineraryTemplate } from '@/lib/itineraries/types';

const SLOT_LABEL = {
  morning: 'Mattina',
  afternoon: 'Pomeriggio',
  evening: 'Sera',
} as const;

type Slot = keyof typeof SLOT_LABEL;

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
      <header className="shrink-0 border-b border-slate-100/90 px-4 py-3 sm:px-5">
        <h2 className="font-display text-base font-semibold text-slate-900">Itinerario</h2>
        <p className="text-xs text-slate-500">
          {template.destination_name} · {template.duration_days} giorni
        </p>
      </header>
      <div className="ws-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <ol className="space-y-7">
          {template.days.map((day) => {
            const { bySlot } = slotsForDay(template, day.day_number);
            return (
              <li key={day.day_number}>
                <h3 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-slate-800">
                  Giorno {day.day_number}
                </h3>
                <p className="mt-0.5 text-sm text-slate-600">{day.title}</p>
                <div className="mt-2 h-px bg-slate-100" />
                {(Object.keys(SLOT_LABEL) as Slot[]).map((slot) => {
                  const items = bySlot[slot];
                  if (!items.length) return null;
                  return (
                    <div key={slot} className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {SLOT_LABEL[slot]}
                      </p>
                      <ul className="mt-1.5 space-y-1.5">
                        {items.map((item) => (
                          <li
                            key={item}
                            className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2 text-sm text-slate-700"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
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
    <div className="flex flex-col items-start gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="text-sm text-slate-600">{body}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 text-sm font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-md"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
