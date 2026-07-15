'use client';

import { useEffect, useRef } from 'react';
import { googleMapsPlaceUrl } from '@/lib/maps/google-maps-links';
import type { MapPin } from '@/lib/maps/pins';
import { resolveDestinationCoords } from '@/lib/maps/coordinates';
import type { DestinationMeta } from '@/types/composer';
import 'leaflet/dist/leaflet.css';

type TripMapProps = {
  destination: string;
  destinationMeta?: DestinationMeta | null;
  pins: MapPin[];
  activeDayIndex?: number;
  highlightedPinId?: string | null;
  onPinClick?: (pin: MapPin) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  interactive?: boolean;
  /** Draw a dashed path through stop pins (excludes destination fallback). */
  showRoute?: boolean;
  /** Smooth flyTo / flyToBounds when pins or day change. */
  animateFit?: boolean;
};

const DAY_COLORS = ['#0ea5e9', '#f97316', '#8b5cf6', '#10b981', '#ec4899', '#eab308', '#6366f1'];
const ROUTE_COLOR = '#38bdf8';

function isStopPin(pin: MapPin): boolean {
  return pin.id !== 'destination' && Boolean(pin.blockId);
}

export function TripMap({
  destination,
  destinationMeta,
  pins,
  activeDayIndex,
  highlightedPinId,
  onPinClick,
  onMapClick,
  className = '',
  interactive = true,
  showRoute = false,
  animateFit = true,
}: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeRef = useRef<any>(null);
  const onMapClickRef = useRef(onMapClick);
  const onPinClickRef = useRef(onPinClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    void import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;

      const center =
        resolveDestinationCoords(destination, destinationMeta) ?? { lat: 41.9, lng: 12.5 };

      const map = L.map(containerRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
      }).setView([center.lat, center.lng], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      if (interactive) {
        map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
        });
      }

      mapRef.current = map;
      // Invalidate size after layout settles (split-screen)
      requestAnimationFrame(() => map.invalidateSize());
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
      routeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, destinationMeta?.lat, destinationMeta?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    void import('leaflet').then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (routeRef.current) {
        routeRef.current.remove();
        routeRef.current = null;
      }

      const bounds: [number, number][] = [];
      const routePoints: [number, number][] = [];

      for (const pin of pins) {
        const dayColor = DAY_COLORS[(pin.dayIndex - 1) % DAY_COLORS.length];
        const isActive = activeDayIndex === pin.dayIndex;
        const isHighlighted = highlightedPinId === pin.id || highlightedPinId === pin.blockId;
        const size = isHighlighted ? 44 : isActive ? 38 : 32;
        const orderLabel = isStopPin(pin)
          ? String(routePoints.length + 1)
          : '';

        const icon = L.divIcon({
          className: 'trip-map-marker',
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${dayColor};
            border:3px solid ${isHighlighted ? '#fff' : 'rgba(255,255,255,0.85)'};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            font-size:${size * 0.42}px;
            box-shadow:0 4px 14px rgba(0,0,0,0.35);
            transform:translate(-50%,-50%);
            transition:transform 0.2s;
            ${isHighlighted ? 'transform:translate(-50%,-50%) scale(1.15);' : ''}
          ">${isStopPin(pin) && !pin.emoji ? orderLabel : pin.emoji}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map);
        const gmapsUrl = googleMapsPlaceUrl(pin.lat, pin.lng, pin.label);
        const safeLabel = pin.label.replace(/[<>&"]/g, (c) =>
          ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c
        );
        marker.bindPopup(
          `<strong>Giorno ${pin.dayIndex}</strong><br/>${safeLabel}<br/>
           <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;margin-top:6px;font-size:11px;color:#38bdf8;text-decoration:none;">
             Apri in Google Maps
           </a>`,
          { closeButton: false, className: 'trip-map-popup' }
        );

        marker.on('click', () => onPinClickRef.current?.(pin));

        markersRef.current.push(marker);
        bounds.push([pin.lat, pin.lng]);
        if (isStopPin(pin)) {
          routePoints.push([pin.lat, pin.lng]);
        }
      }

      if (showRoute && routePoints.length >= 2) {
        routeRef.current = L.polyline(routePoints, {
          color: ROUTE_COLOR,
          weight: 3,
          opacity: 0.85,
          dashArray: '10 12',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      map.invalidateSize();

      const fitTargets = routePoints.length > 0 ? routePoints : bounds;
      if (fitTargets.length > 1) {
        const latLngBounds = L.latLngBounds(fitTargets);
        if (animateFit && typeof map.flyToBounds === 'function') {
          map.flyToBounds(latLngBounds, { padding: [56, 56], maxZoom: 14, duration: 0.9 });
        } else {
          map.fitBounds(latLngBounds, { padding: [48, 48], maxZoom: 13 });
        }
      } else if (fitTargets.length === 1) {
        if (animateFit && typeof map.flyTo === 'function') {
          map.flyTo(fitTargets[0], 13, { duration: 0.75 });
        } else {
          map.setView(fitTargets[0], 12);
        }
      }
    });
  }, [pins, activeDayIndex, highlightedPinId, showRoute, animateFit]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 ${className}`}
    >
      <div ref={containerRef} className="h-full w-full min-h-[280px]" />
      {onMapClick && interactive && (
        <p className="absolute bottom-3 left-3 right-3 text-center text-[10px] text-white/70 bg-black/40 backdrop-blur-sm rounded-full py-1.5 px-3 pointer-events-none">
          Clicca sulla mappa per aggiungere una tappa al giorno attivo
        </p>
      )}
    </div>
  );
}
