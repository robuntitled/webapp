'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getMaster } from '@/lib/itineraries/masters';
import { resolveDestinationCoords } from '@/lib/maps/coordinates';
import type { MapPin } from '@/lib/maps/pins';
import { cn } from '@/lib/utils';

const ReactLeafletTripMap = dynamic(
  () =>
    import('@/components/maps/ReactLeafletTripMap').then((m) => m.ReactLeafletTripMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full animate-pulse rounded-2xl bg-[var(--color-tint)]" />
    ),
  }
);

type Props = {
  slugs: string[];
  className?: string;
};

/**
 * Minimal stylized destination map (Carto/Esri soft tiles, numbered pins, thin route).
 * Same visual language as DeterministicPlanPanel / ReactLeafletTripMap.
 */
export function OrganizzaDestinationMap({ slugs, className }: Props) {
  const unique = useMemo(
    () => [...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean))],
    [slugs]
  );

  const { pins, title } = useMemo(() => {
    const pinsOut: MapPin[] = [];
    const names: string[] = [];
    unique.forEach((slug, idx) => {
      const master = getMaster(slug);
      names.push(master?.nameIt ?? slug);
      const hubStop = master?.stops.find((s) => s.airportHub) ?? master?.stops[0];
      const coords =
        hubStop != null
          ? { lat: hubStop.lat, lng: hubStop.lng }
          : resolveDestinationCoords(slug);
      if (!coords) return;
      pinsOut.push({
        id: `dest-${slug}`,
        blockId: `dest-${slug}`,
        lat: coords.lat,
        lng: coords.lng,
        label: master?.nameIt ?? slug,
        dayIndex: idx + 1,
        blockType: 'destination',
        emoji: String(idx + 1),
      });
      // A couple of core stops for route feel — not dense POI clutter
      if (master) {
        master.stops
          .filter((s) => s.priority === 'core')
          .slice(0, 2)
          .forEach((s, j) => {
            if (s === hubStop) return;
            pinsOut.push({
              id: `stop-${slug}-${s.id}`,
              blockId: `stop-${slug}-${s.id}`,
              lat: s.lat,
              lng: s.lng,
              label: s.nameIt,
              dayIndex: idx * 10 + j + 2,
              blockType: 'attraction',
              emoji: String(idx * 10 + j + 2),
            });
          });
      }
    });
    return { pins: pinsOut, title: names.join(' · ') || 'Destinazione' };
  }, [unique]);

  if (!pins.length) return null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]',
        className
      )}
      data-testid="organizza-destination-map"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)]/70 px-3 py-2">
        <p className="text-xs font-semibold text-[var(--color-text)]">{title}</p>
        <p className="text-[10px] text-[var(--color-text-secondary)]">Mappa orientativa</p>
      </div>
      <div className="relative h-44 w-full sm:h-56">
        <ReactLeafletTripMap
          destination={unique[0] ?? 'destinazione'}
          pins={pins}
          showRoute={pins.length > 1}
          interactive={false}
          className="h-full w-full [&_.leaflet-container]:rounded-none"
        />
      </div>
    </div>
  );
}
