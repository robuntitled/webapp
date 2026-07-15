'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { MapPin } from '@/lib/maps/pins';
import { resolveDestinationCoords } from '@/lib/maps/coordinates';
import type { DestinationMeta } from '@/types/composer';
import { googleMapsPlaceUrl } from '@/lib/maps/google-maps-links';
import 'leaflet/dist/leaflet.css';

type ReactLeafletTripMapProps = {
  destination: string;
  destinationMeta?: DestinationMeta | null;
  pins: MapPin[];
  showRoute?: boolean;
  highlightedPinId?: string | null;
  onPinClick?: (pin: MapPin) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
};

const DAY_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ec4899', '#eab308', '#6366f1'];
const ROUTE_COLOR = '#0ea5e9';

const CARTO_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function isStopPin(pin: MapPin): boolean {
  return pin.id !== 'destination' && Boolean(pin.blockId);
}

function makeIcon(pin: MapPin, highlighted: boolean, index: number) {
  const color = DAY_COLORS[(pin.dayIndex - 1) % DAY_COLORS.length];
  const size = highlighted ? 40 : 34;
  const label = pin.emoji || String(index + 1);

  return L.divIcon({
    className: 'rl-trip-marker',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid ${highlighted ? '#fff' : 'rgba(255,255,255,0.9)'};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.4}px;
      box-shadow:0 3px 12px rgba(15,23,42,0.28);
      transform:translate(-50%,-50%);
      ${highlighted ? 'transform:translate(-50%,-50%) scale(1.12);' : ''}
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({
  pins,
  animate,
}: {
  pins: MapPin[];
  animate: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    if (pins.length === 1) {
      if (animate) map.flyTo(pins[0], 13, { duration: 0.75 });
      else map.setView([pins[0].lat, pins[0].lng], 13);
      return;
    }
    if (animate) {
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 14, duration: 0.85 });
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, pins, animate]);

  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onMapClick) return;
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, onMapClick]);
  return null;
}

export function ReactLeafletTripMap({
  destination,
  destinationMeta,
  pins,
  showRoute = true,
  highlightedPinId,
  onPinClick,
  onMapClick,
  className = '',
}: ReactLeafletTripMapProps) {
  const center = useMemo(() => {
    return (
      resolveDestinationCoords(destination, destinationMeta) ?? { lat: 41.9, lng: 12.5 }
    );
  }, [destination, destinationMeta]);

  const stopPins = useMemo(() => pins.filter(isStopPin), [pins]);
  const routePositions = useMemo(
    () => stopPins.map((p) => [p.lat, p.lng] as [number, number]),
    [stopPins]
  );
  const fitPins = stopPins.length > 0 ? stopPins : pins;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        className="h-full w-full z-0"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer url={CARTO_URL} attribution={CARTO_ATTR} maxZoom={19} />
        <FitBounds pins={fitPins} animate />
        <MapClickHandler onMapClick={onMapClick} />

        {showRoute && routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: ROUTE_COLOR,
              weight: 3,
              opacity: 0.8,
              dashArray: '10 12',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {pins.map((pin, i) => {
          const highlighted =
            highlightedPinId === pin.id || highlightedPinId === pin.blockId;
          const stopIndex = stopPins.findIndex((p) => p.id === pin.id);
          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={makeIcon(pin, highlighted, stopIndex >= 0 ? stopIndex : i)}
              eventHandlers={{
                click: () => onPinClick?.(pin),
              }}
            >
              <Popup>
                <strong>Giorno {pin.dayIndex}</strong>
                <br />
                {pin.label}
                <br />
                <a
                  href={googleMapsPlaceUrl(pin.lat, pin.lng, pin.label)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 text-xs"
                >
                  Apri in Google Maps
                </a>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {onMapClick && (
        <p className="pointer-events-none absolute bottom-3 left-3 right-3 z-[400] rounded-full bg-white/90 px-3 py-1.5 text-center text-[10px] text-slate-600 shadow-sm backdrop-blur">
          Clicca sulla mappa per aggiungere una tappa
        </p>
      )}
    </div>
  );
}
