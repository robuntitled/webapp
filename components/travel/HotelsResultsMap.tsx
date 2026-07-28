'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type HotelMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price?: number;
  currency?: string;
};

/** Alias generico (hotel / attività / attrazioni) */
export type ResultsMapPin = HotelMapPin;

type HotelsResultsMapProps = {
  pins: HotelMapPin[];
  highlightedId?: string | null;
  onPinClick?: (id: string) => void;
  className?: string;
  emptyLabel?: string;
};

const CARTO_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function makeIcon(highlighted: boolean, priceLabel?: string) {
  const bg = highlighted ? '#365f73' : '#1e3a4c';
  const label = priceLabel
    ? `<span style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap">${priceLabel}</span>`
    : `<span style="width:8px;height:8px;border-radius:50%;background:#fff;display:block"></span>`;
  return L.divIcon({
    className: 'hotel-map-marker',
    html: `<div style="
      transform:translate(-50%,-100%);
      background:${bg};
      border:2px solid #fff;
      border-radius:999px;
      padding:4px 8px;
      box-shadow:0 4px 14px rgba(15,23,42,0.28);
      display:flex;align-items:center;justify-content:center;
      min-width:28px;min-height:28px;
    ">${label}</div>`,
    iconSize: [40, 32],
    iconAnchor: [20, 32],
  });
}

function FitPins({ pins }: { pins: HotelMapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pins.length) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.18));
  }, [map, pins]);
  return null;
}

export function HotelsResultsMap({
  pins,
  highlightedId,
  onPinClick,
  className,
  emptyLabel = 'Coordinate non disponibili per questa ricerca',
}: HotelsResultsMapProps) {
  if (pins.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground ${className ?? ''}`}
      >
        {emptyLabel}
      </div>
    );
  }

  const center: [number, number] = [pins[0].lat, pins[0].lng];

  return (
    <div className={`overflow-hidden rounded-2xl border border-border/70 ${className ?? ''}`}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full min-h-[280px]"
        style={{ zIndex: 0 }}
      >
        <TileLayer url={CARTO_URL} attribution={CARTO_ATTR} />
        <FitPins pins={pins} />
        {pins.map((p) => {
          const priceLabel =
            p.price != null
              ? `${Math.round(p.price)}${p.currency === 'EUR' ? '€' : ''}`
              : undefined;
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={makeIcon(highlightedId === p.id, priceLabel)}
              eventHandlers={{
                click: () => onPinClick?.(p.id),
              }}
            >
              <Popup>
                <p className="m-0 text-sm font-semibold">{p.name}</p>
                {p.price != null ? (
                  <p className="m-0 mt-0.5 text-xs text-slate-600">
                    da {Math.round(p.price)} {p.currency ?? 'EUR'}
                  </p>
                ) : null}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
