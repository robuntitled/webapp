'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
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
      <div className="flex h-full min-h-[280px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Caricamento mappa…
      </div>
    ),
  }
);

/** Mappa locale (Leaflet) accanto all’itinerario: solo pin con lat/lng nel modello. */
export function ItineraryWorldMap({
  template,
  className,
  highlightedDay,
  onDaySelect,
}: {
  template: ItineraryTemplate;
  className?: string;
  highlightedDay?: number | null;
  onDaySelect?: (dayNumber: number) => void;
}) {
  const pins = useMemo(() => buildPinsFromItineraryTemplate(template), [template]);
  const dest = findCatalogDestination(template.destination_slug);
  const highlightedPinId =
    highlightedDay != null ? `day-${highlightedDay}` : null;

  if (pins.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500',
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
        <p className="text-[10px] font-medium text-slate-400">Solo dati in archivio</p>
      </div>
      <div className="h-[min(52vh,420px)] w-full lg:h-[min(70vh,560px)]">
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
          onPinClick={(pin) => onDaySelect?.(pin.dayIndex)}
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
  const [activeDay, setActiveDay] = useState<number | null>(null);

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2 lg:items-start', className)}>
      <ol className="space-y-2">
        {template.days.map((day) => (
          <li key={day.day_number}>
            <button
              type="button"
              onClick={() => setActiveDay(day.day_number)}
              onMouseEnter={() => setActiveDay(day.day_number)}
              className={cn(
                'w-full rounded-2xl border px-4 py-3 text-left transition',
                activeDay === day.day_number
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-primary/30'
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Giorno {day.day_number}
              </p>
              <p className="font-semibold text-slate-900">{day.title}</p>
              <p className="mt-1 text-sm text-slate-600">{day.description}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {day.area_segment}
                {day.lat != null && day.lng != null
                  ? ` · ${day.lat.toFixed(2)}, ${day.lng.toFixed(2)}`
                  : ''}
              </p>
            </button>
          </li>
        ))}
      </ol>
      <div className="lg:sticky lg:top-20">
        <ItineraryWorldMap
          template={template}
          highlightedDay={activeDay}
          onDaySelect={setActiveDay}
        />
      </div>
    </div>
  );
}
