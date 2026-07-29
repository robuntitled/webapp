'use client';

import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Maximize2, Minimize2, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';

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
  /** Mostra pulsante espandi fullscreen (default true) */
  expandable?: boolean;
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

function InvalidateSize({ tick }: { tick: number }) {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(t);
  }, [map, tick]);
  return null;
}

function MapCanvas({
  pins,
  highlightedId,
  onPinClick,
  scrollZoom,
  sizeTick,
}: {
  pins: HotelMapPin[];
  highlightedId?: string | null;
  onPinClick?: (id: string) => void;
  scrollZoom: boolean;
  sizeTick: number;
}) {
  const center: [number, number] = [pins[0].lat, pins[0].lng];
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={scrollZoom}
      attributionControl={false}
      className="h-full w-full min-h-[280px]"
      style={{ zIndex: 0 }}
    >
      <TileLayer url={CARTO_URL} attribution={CARTO_ATTR} />
      <FitPins pins={pins} />
      <InvalidateSize tick={sizeTick} />
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
  );
}

export function HotelsResultsMap({
  pins,
  highlightedId,
  onPinClick,
  className,
  emptyLabel = 'Coordinate non disponibili per questa ricerca',
  expandable = true,
}: HotelsResultsMapProps) {
  const [expanded, setExpanded] = useState(false);
  const [sizeTick, setSizeTick] = useState(0);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    setSizeTick((t) => t + 1);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) setSizeTick((t) => t + 1);
  }, [expanded, pins.length]);

  if (pins.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground',
          className
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="absolute right-2.5 top-2.5 z-[2000] inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-background px-2.5 text-xs font-semibold text-foreground shadow-lg transition hover:bg-muted"
      aria-label={expanded ? 'Riduci mappa' : 'Espandi mappa'}
    >
      {expanded ? (
        <>
          <Minimize2 className="h-3.5 w-3.5" />
          Riduci
        </>
      ) : (
        <>
          <Maximize2 className="h-3.5 w-3.5" />
          Espandi
        </>
      )}
    </button>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 p-3 sm:p-4">
        <div className="relative mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            Mappa · {pins.length} punti
          </p>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold transition hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
            Chiudi
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/70">
          {expandable ? toggle : null}
          <MapCanvas
            pins={pins}
            highlightedId={highlightedId}
            onPinClick={onPinClick}
            scrollZoom
            sizeTick={sizeTick}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/70',
        className
      )}
    >
      {expandable ? toggle : null}
      <MapCanvas
        pins={pins}
        highlightedId={highlightedId}
        onPinClick={onPinClick}
        scrollZoom={false}
        sizeTick={sizeTick}
      />
    </div>
  );
}
