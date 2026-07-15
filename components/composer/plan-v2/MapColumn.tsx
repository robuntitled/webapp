'use client';

import { TripMap } from '@/components/maps/TripMap';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { ComposerDraft } from '@/types/composer';

type MapColumnProps = {
  draft: ComposerDraft;
  pins: MapPin[];
  mapMode: MapViewMode;
  activeDayIndex: number;
  highlightedPinId: string | null;
  onPinClick: (pin: MapPin) => void;
  onMapClick: (lat: number, lng: number) => void;
};

export function MapColumn({
  draft,
  pins,
  mapMode,
  activeDayIndex,
  highlightedPinId,
  onPinClick,
  onMapClick,
}: MapColumnProps) {
  const stopCount = pins.filter((p) => p.id !== 'destination' && p.blockId).length;

  return (
    <aside className="plan-v2-map flex h-full min-h-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">Mappa</p>
          <p className="truncate text-[11px] text-slate-500">
            {mapMode === 'fullTrip'
              ? `Percorso completo · ${stopCount} tappe`
              : `Giorno ${activeDayIndex} · ${stopCount} tappe`}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <TripMap
          destination={draft.destination}
          destinationMeta={draft.destinationMeta}
          pins={pins}
          activeDayIndex={activeDayIndex}
          highlightedPinId={highlightedPinId}
          showRoute
          className="h-full min-h-[280px] rounded-none border-0"
          onPinClick={onPinClick}
          onMapClick={mapMode === 'day' ? onMapClick : undefined}
        />
      </div>
    </aside>
  );
}
