'use client';

import { useEffect, useMemo } from 'react';
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { DestinationMeta } from '@/types/composer';
import { resolveDestinationCoords } from '@/lib/maps/coordinates';
import { GOOGLE_MAP_DARK_STYLES } from '@/lib/maps/google-map-styles';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const ROUTE_COLOR = '#f97316';
const ROUTE_GLOW = '#fb923c';

type ReactGoogleTripMapProps = {
  destination: string;
  destinationMeta?: DestinationMeta | null;
  pins: MapPin[];
  mapMode: MapViewMode;
  activeDayIndex: number;
  highlightedPinId?: string | null;
  onPinClick?: (pin: MapPin) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
};

function isStopPin(pin: MapPin): boolean {
  return pin.id !== 'destination' && Boolean(pin.blockId);
}

function MapFitBounds({
  pins,
  mapMode,
  stopPins,
}: {
  pins: MapPin[];
  mapMode: MapViewMode;
  stopPins: MapPin[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || pins.length === 0) return;

    const fitPins = stopPins.length > 0 ? stopPins : pins;
    const bounds = new google.maps.LatLngBounds();
    fitPins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));

    const pad = mapMode === 'fullTrip' ? 60 : 50;
    const maxZoom = mapMode === 'fullTrip' ? 11 : 13;

    map.fitBounds(bounds, { top: pad, right: pad, bottom: pad, left: pad });
    const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      const zoom = map.getZoom();
      if (zoom != null && zoom > maxZoom) map.setZoom(maxZoom);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, pins, stopPins, mapMode]);

  return null;
}

function RoutePolyline({ path }: { path: google.maps.LatLngLiteral[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    const glow = new mapsLib.Polyline({
      path,
      strokeColor: ROUTE_GLOW,
      strokeOpacity: 0.35,
      strokeWeight: 8,
      geodesic: true,
    });
    const line = new mapsLib.Polyline({
      path,
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 0.95,
      strokeWeight: 3,
      geodesic: true,
    });

    glow.setMap(map);
    line.setMap(map);

    return () => {
      glow.setMap(null);
      line.setMap(null);
    };
  }, [map, mapsLib, path]);

  return null;
}

function TripMapInner({
  destination,
  destinationMeta,
  pins,
  mapMode,
  activeDayIndex,
  highlightedPinId,
  onPinClick,
  onMapClick,
  className = '',
}: ReactGoogleTripMapProps) {
  const center = useMemo(
    () => resolveDestinationCoords(destination, destinationMeta) ?? { lat: 41.9, lng: 12.5 },
    [destination, destinationMeta]
  );
  const stopPins = useMemo(() => pins.filter(isStopPin), [pins]);
  const routePath = useMemo(
    () => stopPins.map((p) => ({ lat: p.lat, lng: p.lng })),
    [stopPins]
  );

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Map
        defaultCenter={center}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        styles={GOOGLE_MAP_DARK_STYLES}
        backgroundColor="#0f172a"
        onClick={(e) => {
          const latLng = e.detail.latLng;
          if (latLng && onMapClick) onMapClick(latLng.lat, latLng.lng);
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <MapFitBounds pins={pins} stopPins={stopPins} mapMode={mapMode} />
        {routePath.length >= 2 && <RoutePolyline path={routePath} />}

        {pins.map((pin) => {
          const stopIndex = stopPins.findIndex((p) => p.id === pin.id);
          const highlighted = highlightedPinId === pin.id || highlightedPinId === pin.blockId;
          const color =
            pin.dayIndex === activeDayIndex || mapMode === 'fullTrip' ? '#f97316' : '#a855f7';
          const label = pin.emoji || (isStopPin(pin) ? String(stopIndex + 1) : '');

          return (
            <Marker
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              onClick={() => onPinClick?.(pin)}
              label={{
                text: label,
                color: '#ffffff',
                fontSize: highlighted ? '14px' : '12px',
                fontWeight: '700',
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: highlighted ? '#ffffff' : 'rgba(255,255,255,0.85)',
                strokeWeight: highlighted ? 3 : 2,
                scale: highlighted ? 14 : 11,
              }}
              zIndex={highlighted ? 100 : 10}
            />
          );
        })}
      </Map>

      {onMapClick && (
        <p className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-full bg-black/60 px-3 py-1.5 text-center text-[10px] text-white/80 backdrop-blur">
          Clicca sulla mappa per aggiungere una tappa
        </p>
      )}
    </div>
  );
}

export function ReactGoogleTripMap(props: ReactGoogleTripMapProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0f172a] p-6 text-center text-sm text-white/60">
        <p>Mappa non configurata</p>
        <p className="text-xs text-white/40">
          Aggiungi NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local per attivare Google Maps.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <TripMapInner {...props} />
    </APIProvider>
  );
}