'use client';

import { useState } from 'react';
import { TripMap } from '@/components/maps/TripMap';
import { Button } from '@/components/ui/button';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { ComposerDraft } from '@/types/composer';
import { Maximize2, Minimize2 } from 'lucide-react';

type MapColumnProps = {
  draft: ComposerDraft;
  pins: MapPin[];
  mapMode: MapViewMode;
  activeDayIndex: number;
  highlightedPinId: string | null;
  onPinClick: (pin: MapPin) => void;
  onMapClick: (lat: number, lng: number) => void;
};

function MapPanel({
  draft,
  pins,
  mapMode,
  activeDayIndex,
  highlightedPinId,
  onPinClick,
  onMapClick,
  className,
}: MapColumnProps & { className?: string }) {
  return (
    <TripMap
      destination={draft.destination}
      destinationMeta={draft.destinationMeta}
      pins={pins}
      activeDayIndex={activeDayIndex}
      highlightedPinId={highlightedPinId}
      mapMode={mapMode}
      className={className}
      showRoute={false}
      onPinClick={onPinClick}
      onMapClick={onMapClick}
    />
  );
}

export function MapColumn(props: MapColumnProps) {
  const { draft, pins, mapMode, activeDayIndex } = props;
  const [expanded, setExpanded] = useState(false);
  const stopCount = pins.filter((p) => p.id !== 'destination' && p.blockId).length;

  return (
    <>
      <aside className="composer-v3-map flex h-full min-h-0 flex-col border-l border-white/10 bg-[#0b1120]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Mappa</p>
            <p className="truncate text-[11px] text-white/45">
              {mapMode === 'fullTrip'
                ? `Percorso completo · ${stopCount} tappe`
                : `Giorno ${activeDayIndex} · ${stopCount} tappe`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline text-xs">Espandi</span>
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <MapPanel {...props} className="h-full min-h-[280px] rounded-none border-0" />
        </div>
      </aside>

      {expanded && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#0b1120]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Mappa — {draft.destinationMeta?.label ?? draft.destination}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg text-white/70 hover:bg-white/10"
              onClick={() => setExpanded(false)}
            >
              <Minimize2 className="h-4 w-4 mr-1" />
              Riduci
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <MapPanel {...props} className="h-full w-full" />
          </div>
        </div>
      )}
    </>
  );
}