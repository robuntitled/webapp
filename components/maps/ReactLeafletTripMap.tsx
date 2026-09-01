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
import { getLeafletTileLayer } from '@/lib/maps/tile-layer';

type ReactLeafletTripMapProps = {
  destination: string;
  destinationMeta?: DestinationMeta | null;
  pins: MapPin[];
  showRoute?: boolean;
  highlightedPinId?: string | null;
  onPinClick?: (pin: MapPin) => void;
  onMapClick?: (lat: number, lng: number) => void;
  /** Disabilita pan/zoom/click — mappa solo visualizzazione. */
  interactive?: boolean;
  className?: string;
};

const PIN_FILL = '#0F766E';
const PIN_ACTIVE = '#F97316';
const ROUTE_COLOR = '#0F766E';

const MAP_TILES = getLeafletTileLayer();

function isStopPin(pin: MapPin): boolean {
  return pin.id !== 'destination' && Boolean(pin.blockId);
}

/** Pin discreto a goccia, senza bolle colorate. */
function makeIcon(highlighted: boolean) {
  const fill = highlighted ? PIN_ACTIVE : PIN_FILL;
  const size = highlighted ? 26 : 22;
  return L.divIcon({
    className: 'rl-trip-pin',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 32" style="display:block;filter:drop-shadow(0 1px 2px rgba(15,23,42,.28))">
      <path d="M12 0C6.5 0 2 4.5 2 10c0 7.2 10 20 10 20s10-12.8 10-20C22 4.5 17.5 0 12 0z" fill="${fill}"/>
      <circle cx="12" cy="10" r="3.2" fill="#fff"/>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
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
      if (animate) map.flyTo(pins[0], 12, { duration: 0.75 });
      else map.setView([pins[0].lat, pins[0].lng], 12);
      return;
    }
    if (animate) {
      map.flyToBounds(bounds, { padding: [36, 36], maxZoom: 12, duration: 0.85 });
    } else {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
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
  interactive = true,
  className = '',
}: ReactLeafletTripMapProps) {
  const center = useMemo(() => {
    return (
      resolveDestinationCoords(destination, destinationMeta) ?? { lat: 41.9, lng: 12.5 }
    );
  }, [destination, destinationMeta]);

  const stopPins = useMemo(() => pins.filter(isStopPin), [pins]);
  const routePositions = useMemo(() => {
    const pts: [number, number][] = [];
    for (const p of stopPins) {
      const prev = pts[pts.length - 1];
      if (prev && prev[0] === p.lat && prev[1] === p.lng) continue;
      pts.push([p.lat, p.lng]);
    }
    return pts;
  }, [stopPins]);
  const fitPins = stopPins.length > 0 ? stopPins : pins;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={11}
        className="h-full w-full z-0 grayscale-[20%] contrast-[1.05] [&_.leaflet-control-attribution]:!hidden"
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} maxZoom={19} />
        <FitBounds pins={fitPins} animate={interactive} />
        {interactive ? <MapClickHandler onMapClick={onMapClick} /> : null}

        {showRoute && routePositions.length >= 2 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: ROUTE_COLOR,
              weight: 1.75,
              opacity: 0.75,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {pins.map((pin) => {
          const highlighted =
            highlightedPinId === pin.id || highlightedPinId === pin.blockId;
          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={makeIcon(highlighted)}
              interactive={interactive}
              eventHandlers={
                interactive && onPinClick
                  ? { click: () => onPinClick(pin) }
                  : undefined
              }
            >
              {interactive ? (
                <Popup>
                  <strong>Giorno {pin.dayIndex}</strong>
                  <br />
                  {pin.label}
                  <br />
                  <a
                    href={googleMapsPlaceUrl(pin.lat, pin.lng, pin.label)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 text-xs"
                  >
                    Apri in Google Maps
                  </a>
                </Popup>
              ) : null}
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
