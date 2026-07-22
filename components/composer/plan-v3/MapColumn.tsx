'use client';

import { useCallback, useEffect, useState } from 'react';
import { TripMap } from '@/components/maps/TripMap';
import type { MapCameraTarget } from '@/components/maps/TripMap';
import { MapSearchBar } from '@/components/composer/plan-v3/MapSearchBar';
import { Button } from '@/components/ui/button';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { PlaceResult } from '@/lib/places/types';
import type { ComposerDraft } from '@/types/composer';
import { Bus, Hotel, Maximize2, Minimize2, Plus, X } from 'lucide-react';

type MapColumnProps = {
  draft: ComposerDraft;
  pins: MapPin[];
  mapMode: MapViewMode;
  activeDayIndex: number;
  highlightedPinId: string | null;
  onPinClick: (pin: MapPin) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onPoiClick?: (payload: { placeId: string; lat: number; lng: number }) => void;
  onAddActivity?: () => void;
  onAddTransport?: () => void;
  onAddHotel?: () => void;
};

function zoomForPlace(place: PlaceResult): number {
  const t = place.placeType?.toLowerCase() ?? '';
  if (t.includes('country') || t.includes('state')) return 6;
  if (t.includes('city') || t.includes('town') || t.includes('municipality')) return 12;
  if (t.includes('suburb') || t.includes('neighbourhood') || t.includes('neighborhood')) return 14;
  return 15;
}

/**
 * Una sola istanza mappa: expand/collapse solo CSS/layout.
 * Evita un secondo Dynamic Maps billable load in fullscreen.
 */
export function MapColumn(props: MapColumnProps) {
  const {
    draft,
    pins,
    mapMode,
    activeDayIndex,
    onAddActivity,
    onAddTransport,
    onAddHotel,
  } = props;
  const [expanded, setExpanded] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<MapCameraTarget | null>(null);
  const stopCount = pins.filter((p) => p.id !== 'destination' && p.blockId).length;
  const hasAddActions = Boolean(onAddActivity || onAddTransport || onAddHotel);

  const handleSearchSelect = useCallback((place: PlaceResult) => {
    setCameraTarget({
      lat: place.lat,
      lng: place.lng,
      zoom: zoomForPlace(place),
      nonce: Date.now(),
    });
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  // Google Maps ricalcola tiles quando il container cambia dimensione
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 80);
    return () => window.clearTimeout(t);
  }, [expanded]);

  const title = expanded
    ? `Mappa — ${draft.destinationMeta?.label ?? draft.destination}`
    : 'Mappa';
  const subtitle =
    mapMode === 'fullTrip'
      ? `Percorso completo · ${stopCount} tappe`
      : `Giorno ${activeDayIndex} · ${stopCount} tappe`;

  /** Lascia la mappa in fullscreen; i Dialog (z-50) restano sopra z-40. */
  const runAdd = (fn?: () => void) => {
    fn?.();
  };

  // Stesso look dell’itinerario (Aggiungi gradient, Trasporto/Hotel outline)
  const addActions = hasAddActions && (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {onAddActivity && (
        <Button
          type="button"
          size="sm"
          onClick={() => runAdd(onAddActivity)}
          className="h-9 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-3 font-bold text-white shadow-lg shadow-orange-500/20 hover:brightness-110"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Aggiungi
        </Button>
      )}
      {onAddTransport && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => runAdd(onAddTransport)}
          className="h-9 rounded-xl border-white/15 bg-white/5 px-3 text-white hover:bg-white/10"
        >
          <Bus className="mr-1.5 h-4 w-4" />
          Trasporto
        </Button>
      )}
      {onAddHotel && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => runAdd(onAddHotel)}
          className="h-9 rounded-xl border-white/15 bg-white/5 px-3 text-white hover:bg-white/10"
        >
          <Hotel className="mr-1.5 h-4 w-4" />
          Hotel
        </Button>
      )}
    </div>
  );

  const floatingAddActions = hasAddActions && (
    <>
      {onAddActivity && (
        <Button
          type="button"
          onClick={() => runAdd(onAddActivity)}
          className="pointer-events-auto h-11 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-4 font-bold text-white shadow-lg shadow-orange-500/20 hover:brightness-110"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Aggiungi
        </Button>
      )}
      {onAddTransport && (
        <Button
          type="button"
          variant="outline"
          onClick={() => runAdd(onAddTransport)}
          className="pointer-events-auto h-11 rounded-xl border-white/15 bg-[#0b1120]/90 px-4 text-white shadow-xl backdrop-blur-md hover:bg-white/10"
        >
          <Bus className="mr-1.5 h-4 w-4" />
          Trasporto
        </Button>
      )}
      {onAddHotel && (
        <Button
          type="button"
          variant="outline"
          onClick={() => runAdd(onAddHotel)}
          className="pointer-events-auto h-11 rounded-xl border-white/15 bg-[#0b1120]/90 px-4 text-white shadow-xl backdrop-blur-md hover:bg-white/10"
        >
          <Hotel className="mr-1.5 h-4 w-4" />
          Hotel
        </Button>
      )}
    </>
  );

  return (
    <aside
      className={
        expanded
          ? // z-40: sotto i Dialog (z-50) se mai restassero aperti insieme
            'fixed inset-0 z-40 flex flex-col bg-[#0b1120]'
          : 'composer-v3-map flex h-full min-h-0 flex-col border-l border-white/10 bg-[#0b1120]'
      }
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded ? true : undefined}
      aria-label={expanded ? 'Mappa a schermo intero' : undefined}
    >
      <div
        className={
          expanded
            ? 'relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0b1120]/95 px-4 py-3 backdrop-blur'
            : 'flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3'
        }
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {!expanded && <p className="truncate text-[11px] text-white/45">{subtitle}</p>}
        </div>

        {expanded ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {addActions}
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
        ) : (
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
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <TripMap
          destination={draft.destination}
          destinationMeta={draft.destinationMeta}
          pins={pins}
          activeDayIndex={activeDayIndex}
          highlightedPinId={props.highlightedPinId}
          cameraTarget={cameraTarget}
          mapMode={mapMode}
          className={
            expanded ? 'h-full w-full' : 'h-full min-h-[280px] rounded-none border-0'
          }
          showRoute={false}
          onPinClick={props.onPinClick}
          onMapClick={props.onMapClick}
          onPoiClick={props.onPoiClick}
        />

        <div
          className={
            expanded
              ? 'pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-4'
              : 'pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3'
          }
        >
          <MapSearchBar
            biasQuery={draft.destinationMeta?.label ?? draft.destination}
            onSelect={handleSearchSelect}
            compact={!expanded}
            className={expanded ? 'w-full max-w-lg' : 'w-full max-w-sm'}
          />
        </div>

        {expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-2 px-4 pb-6">
            {floatingAddActions}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="pointer-events-auto flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-[#0b1120]/90 px-5 text-sm font-semibold text-white shadow-2xl backdrop-blur-md transition hover:border-accent/50 hover:bg-[#0f172a]"
            >
              <Minimize2 className="h-4 w-4 text-accent" />
              Torna al piano
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
