'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { buildPinsFromItineraryTemplate } from '@/lib/itineraries/geo';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { ItineraryTemplate } from '@/lib/itineraries/types';
import { cn } from '@/lib/utils';

const ReactLeafletTripMap = dynamic(
  () =>
    import('@/components/maps/ReactLeafletTripMap').then((m) => m.ReactLeafletTripMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[220px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Caricamento mappa…
      </div>
    ),
  }
);

/** Mappa locale (Leaflet) sotto l’itinerario: solo pin con lat/lng nel modello. */
export function ItineraryWorldMap({
  template,
  className,
  highlightedDay,
  onDaySelect,
  staticMap = false,
}: {
  template: ItineraryTemplate;
  className?: string;
  highlightedDay?: number | null;
  onDaySelect?: (dayNumber: number) => void;
  staticMap?: boolean;
}) {
  const pins = useMemo(() => buildPinsFromItineraryTemplate(template), [template]);
  const dest = findCatalogDestination(template.destination_slug);
  const highlightedPinId =
    highlightedDay != null ? `day-${highlightedDay}` : null;

  if (pins.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500',
          className
        )}
      >
        <MapPin className="h-5 w-5 text-slate-400" />
        Nessuna coordinata in archivio per questo piano.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Mappa · {pins.length} tappe
        </p>
      </div>
      <div
        className={cn(
          'h-[240px] w-full sm:h-[280px]',
          staticMap && '[&_.leaflet-container]:cursor-default [&_.leaflet-grab]:cursor-default'
        )}
      >
        <ReactLeafletTripMap
          destination={template.destination_name}
          destinationMeta={
            dest?.lat != null && dest?.lng != null
              ? { label: dest.name, lat: dest.lat, lng: dest.lng }
              : null
          }
          pins={pins}
          showRoute
          highlightedPinId={highlightedPinId}
          interactive={!staticMap}
          onPinClick={staticMap ? undefined : (pin) => onDaySelect?.(pin.dayIndex)}
        />
      </div>
    </div>
  );
}

export function ItineraryDaysWithMap({
  template,
  className,
}: {
  template: ItineraryTemplate;
  className?: string;
}) {
  const firstDay = template.days[0]?.day_number ?? 1;
  const [activeDay, setActiveDay] = useState(firstDay);
  const dayRefs = useRef<Map<number, HTMLElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const scrollingFromClick = useRef(false);

  const scrollToDay = useCallback((dayNumber: number) => {
    const el = dayRefs.current.get(dayNumber);
    if (!el) return;
    scrollingFromClick.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveDay(dayNumber);
    window.setTimeout(() => {
      scrollingFromClick.current = false;
    }, 600);
  }, []);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingFromClick.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target) return;
        const day = Number((top.target as HTMLElement).dataset.day);
        if (day) setActiveDay(day);
      },
      { root, rootMargin: '-8% 0px -55% 0px', threshold: [0.15, 0.4, 0.7] }
    );

    for (const el of dayRefs.current.values()) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [template.days.length]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold text-slate-900">Giorno per giorno</p>
        <p className="text-xs text-slate-500">Scorri la timeline · tocca un giorno per saltare</p>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {template.days.map((d) => (
          <button
            key={d.day_number}
            type="button"
            onClick={() => scrollToDay(d.day_number)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
              activeDay === d.day_number
                ? 'bg-primary text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
            )}
          >
            {d.day_number}
          </button>
        ))}
      </div>

      <div
        ref={listRef}
        className="max-h-[min(52vh,420px)] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]"
      >
        {template.days.map((day) => (
          <article
            key={day.day_number}
            ref={(el) => {
              if (el) dayRefs.current.set(day.day_number, el);
              else dayRefs.current.delete(day.day_number);
            }}
            data-day={day.day_number}
            onMouseEnter={() => setActiveDay(day.day_number)}
            className={cn(
              'scroll-mt-3 rounded-2xl border bg-white px-4 py-4 shadow-sm transition sm:px-5',
              activeDay === day.day_number
                ? 'border-primary/40 ring-2 ring-primary/15'
                : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Giorno {day.day_number}
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-slate-900">{day.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{day.description}</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {day.area_segment}
            </p>
          </article>
        ))}
      </div>

      <ItineraryWorldMap
        template={template}
        highlightedDay={activeDay}
        onDaySelect={scrollToDay}
      />
    </div>
  );
}
