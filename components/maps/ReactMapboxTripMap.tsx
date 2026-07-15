'use client';

import { useEffect, useMemo, useRef } from 'react';
import Map, {
  Marker,
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
  type LngLatBoundsLike,
} from 'react-map-gl';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { DestinationMeta } from '@/types/composer';
import { resolveDestinationCoords } from '@/lib/maps/coordinates';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

const ROUTE_COLOR = '#f97316'; // orange-500
const GLOW = '#fb923c'; // orange-400

type ReactMapboxTripMapProps = {
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

export function ReactMapboxTripMap({
  destination,
  destinationMeta,
  pins,
  mapMode,
  activeDayIndex,
  highlightedPinId,
  onPinClick,
  onMapClick,
  className = '',
}: ReactMapboxTripMapProps) {
  const mapRef = useRef<MapRef>(null);
  const center = useMemo(
    () => resolveDestinationCoords(destination, destinationMeta) ?? { lat: 41.9, lng: 12.5 },
    [destination, destinationMeta]
  );
  const stopPins = useMemo(() => pins.filter(isStopPin), [pins]);

  const routeGeoJSON = useMemo(() => {
    const coordinates = stopPins.map((p) => [p.lng, p.lat] as [number, number]);
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
    };
  }, [stopPins]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const fitPins = stopPins.length > 0 ? stopPins : pins;
    if (fitPins.length === 0) return;

    const bounds: LngLatBoundsLike = [
      [Math.min(...fitPins.map((p) => p.lng)), Math.min(...fitPins.map((p) => p.lat))],
      [Math.max(...fitPins.map((p) => p.lng)), Math.max(...fitPins.map((p) => p.lat))],
    ];

    const pad = mapMode === 'fullTrip' ? 60 : 50;
    const maxZoom = mapMode === 'fullTrip' ? 11 : 13;

    map.resize();
    map.fitBounds(bounds, { padding: pad, maxZoom, duration: 900 });
  }, [stopPins, pins, mapMode]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0f172a] p-6 text-center text-sm text-white/60">
        <p>Mappa non configurata</p>
        <p className="text-xs text-white/40">
          Aggiungi NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local per attivare Mapbox.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: center.lat,
          longitude: center.lng,
          zoom: 12,
        }}
        mapStyle={MAPBOX_STYLE}
        onClick={(e: MapLayerMouseEvent) => onMapClick?.(e.lngLat.lat, e.lngLat.lng)}
        style={{ width: '100%', height: '100%' }}
      >
        {stopPins.length >= 2 && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-glow"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': GLOW,
                'line-width': 8,
                'line-opacity': 0.35,
                'line-blur': 8,
              }}
            />
            <Layer
              id="route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': ROUTE_COLOR,
                'line-width': 3,
                'line-opacity': 0.95,
                'line-dasharray': [1, 0.5],
              }}
            />
          </Source>
        )}

        {pins.map((pin, i) => {
          const stopIndex = stopPins.findIndex((p) => p.id === pin.id);
          const highlighted = highlightedPinId === pin.id || highlightedPinId === pin.blockId;
          const size = highlighted ? 42 : 34;
          const color = pin.dayIndex === activeDayIndex || mapMode === 'fullTrip' ? '#f97316' : '#a855f7';
          const label = pin.emoji || (isStopPin(pin) ? String(stopIndex + 1) : '');

          return (
            <Marker
              key={pin.id}
              latitude={pin.lat}
              longitude={pin.lng}
              onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
                e.originalEvent.stopPropagation();
                onPinClick?.(pin);
              }}
              anchor="center"
            >
              <div
                style={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                  border: `3px solid ${highlighted ? '#fff' : 'rgba(255,255,255,0.85)'}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: size * 0.4,
                  color: '#fff',
                  boxShadow: highlighted
                    ? '0 0 20px rgba(249,115,22,0.7), 0 4px 14px rgba(0,0,0,0.45)'
                    : '0 4px 14px rgba(0,0,0,0.45)',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {label}
              </div>
            </Marker>
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
