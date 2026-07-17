'use client';

import { useEffect, useState } from 'react';
import { TripMap } from '@/components/maps/TripMap';
import { Button } from '@/components/ui/button';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { ComposerDraft } from '@/types/composer';
import { Maximize2, Minimize2, X } from 'lucide-react';

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

  // Escape chiude la mappa a schermo intero
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    // blocca scroll body sotto l'overlay
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

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
            <span className="ml-1 hidden text-xs sm:inline">Espandi</span>
          </Button>
        </div>
        <div className="min-h-0 flex-1">
          <MapPanel {...props} className="h-full min-h-[280px] rounded-none border-0" />
        </div>
      </aside>

      {expanded && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-[#0b1120]"
          role="dialog"
          aria-modal="true"
          aria-label="Mappa a schermo intero"
        >
          <div className="relative z-[210] flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0b1120]/95 px-4 py-3 backdrop-blur">
            <p className="min-w-0 truncate text-sm font-semibold text-white">
              Mappa — {draft.destinationMeta?.label ?? draft.destination}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-full bg-white/10 px-4 text-white hover:bg-white/20"
                onClick={() => setExpanded(false)}
              >
                <Minimize2 className="mr-1.5 h-4 w-4" />
                Riduci
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setExpanded(false)}
                aria-label="Chiudi mappa"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Floating reduce — always visible over the map */}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute bottom-6 left-1/2 z-[220] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-[#0b1120]/90 px-5 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-md transition hover:border-accent/50 hover:bg-[#0f172a]"
          >
            <Minimize2 className="h-4 w-4 text-accent" />
            Torna al piano
          </button>

          <div className="relative min-h-0 flex-1">
            <MapPanel {...props} className="h-full w-full" />
          </div>
        </div>
      )}
    </>
  );
}
