'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Moon, Sun, Sunset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ItineraryWorldMap } from '@/components/itineraries/ItineraryWorldMap';
import {
  areaStopsForTemplate,
  slotsForDay,
  type DaySlot,
} from '@/lib/itineraries/day-slots';
import type { ItineraryTemplate } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

const SLOT_ICONS: Record<DaySlot, LucideIcon> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
};

export function ItineraryExplorerWidget({ template }: { template: ItineraryTemplate }) {
  const days = template.days;
  const firstDay = days[0]?.day_number ?? 1;
  const [activeDay, setActiveDay] = useState(firstDay);
  const stripRef = useRef<HTMLDivElement>(null);

  const activeIndex = days.findIndex((d) => d.day_number === activeDay);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const day = days[safeIndex];
  const { bySlot } = slotsForDay(template, day.day_number);
  const areaStops = useMemo(() => areaStopsForTemplate(template), [template]);

  const slotEntries = (Object.keys(SLOT_ICONS) as DaySlot[]).filter(
    (slot) => bySlot[slot].length > 0
  );

  const goToDay = useCallback((dayNumber: number) => {
    setActiveDay(dayNumber);
    requestAnimationFrame(() => {
      stripRef.current
        ?.querySelector(`[data-day="${dayNumber}"]`)
        ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
  }, []);

  const goPrev = () => {
    if (safeIndex > 0) goToDay(days[safeIndex - 1].day_number);
  };

  const goNext = () => {
    if (safeIndex < days.length - 1) goToDay(days[safeIndex + 1].day_number);
  };

  return (
    <section
      className="ws-widget flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl"
      aria-label="Itinerario interattivo"
    >
      <header className="shrink-0 border-b border-slate-100/90 bg-gradient-to-r from-slate-50/80 to-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
              Itinerario
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {template.duration_days} giorni · {template.destination_name}
            </p>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Giorno <span className="font-semibold text-slate-800">{activeDay}</span> di{' '}
            {days.length}
          </p>
        </div>
      </header>

      <div className="relative h-[min(36vh,16rem)] min-h-[11rem] shrink-0 border-b border-slate-100 sm:h-[min(40vh,18rem)] sm:min-h-[12rem]">
        <ItineraryWorldMap
          template={template}
          highlightedDay={activeDay}
          onDaySelect={goToDay}
          compact
          className="h-full rounded-none border-0 shadow-none [&>div:last-child]:!aspect-auto [&>div:last-child]:!h-full [&>div:last-child]:!min-h-0"
        />
        <p className="pointer-events-none absolute bottom-2 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm backdrop-blur">
          Tocca un pin o scegli il giorno — la mappa si aggiorna
        </p>
      </div>

      {areaStops.length > 1 ? (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2 [scrollbar-width:thin]">
          {areaStops.map((stop) => {
            const active = day.area_segment.trim().toLowerCase() === stop.segment.toLowerCase();
            return (
              <button
                key={stop.segment}
                type="button"
                onClick={() => goToDay(stop.day)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition',
                  active
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                )}
              >
                {stop.segment}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-100 px-2 py-2 sm:gap-2 sm:px-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={safeIndex <= 0}
          aria-label="Giorno precedente"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:opacity-35"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          ref={stripRef}
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:thin]"
        >
          {days.map((d) => {
            const selected = d.day_number === activeDay;
            return (
              <button
                key={d.day_number}
                type="button"
                data-day={d.day_number}
                onClick={() => goToDay(d.day_number)}
                aria-label={`Giorno ${d.day_number}: ${d.title}`}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                  selected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-primary/40'
                )}
              >
                {d.day_number}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={goNext}
          disabled={safeIndex >= days.length - 1}
          aria-label="Giorno successivo"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:opacity-35"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="font-display text-xl font-semibold text-slate-900">{day.title}</h3>
          {day.area_segment ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {day.area_segment}
            </span>
          ) : null}
        </div>
        {day.description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{day.description}</p>
        ) : null}

        {slotEntries.length > 0 ? (
          <div className="mt-4 space-y-3">
            {slotEntries.map((slot) => {
              const Icon = SLOT_ICONS[slot];
              const items = bySlot[slot];
              return (
                <div key={slot}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <Icon className="h-3 w-3" aria-hidden />
                    {slot === 'morning' ? 'Mattina' : slot === 'afternoon' ? 'Pomeriggio' : 'Sera'}
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
    </section>
  );
}
