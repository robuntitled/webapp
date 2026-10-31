'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getLeafletTileLayer } from '@/lib/maps/tile-layer';
import type { CommunityPhotoPin } from '@/lib/data/community-map';
import { cn } from '@/lib/utils';

const MAP_TILES = getLeafletTileLayer();

type CommunityMapProps = {
  photoPins: CommunityPhotoPin[];
  className?: string;
};

type BoundPoint = { lat: number; lng: number };

function spreadOverlappingPins<T extends { id: string; lat: number; lng: number }>(
  items: T[]
): Array<T & { displayLat: number; displayLng: number }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const out: Array<T & { displayLat: number; displayLng: number }> = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      const p = group[0];
      out.push({ ...p, displayLat: p.lat, displayLng: p.lng });
      continue;
    }
    const radius = 0.0025 + Math.min(group.length, 8) * 0.00035;
    group.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      out.push({
        ...p,
        displayLat: p.lat + Math.sin(angle) * radius,
        displayLng: p.lng + Math.cos(angle) * radius,
      });
    });
  }
  return out;
}

function FitBounds({ points }: { points: BoundPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView([20, 12], 2, { animate: true });
      return;
    }
    if (points.length === 1) {
      map.flyTo([points[0].lat, points[0].lng], 6, { duration: 0.7 });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.flyToBounds(bounds.pad(0.2), { maxZoom: 7, duration: 0.75 });
  }, [map, points]);
  return null;
}

function MapResizeSync({ expanded, sizeTick }: { expanded: boolean; sizeTick: number }) {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false, pan: false });
    run();
    const raf = requestAnimationFrame(run);
    const t1 = window.setTimeout(run, 80);
    const t2 = window.setTimeout(run, 250);
    const el = map.getContainer().parentElement;
    const ro =
      el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => run()) : null;
    if (el) ro?.observe(el);
    window.addEventListener('resize', run);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [map, expanded, sizeTick]);
  return null;
}

function makePhotoThumbIcon(imageUrl: string) {
  const safe = imageUrl.replace(/"/g, '');
  return L.divIcon({
    className: 'community-photo-marker',
    html: `<div style="width:52px;height:52px;border-radius:16px;overflow:hidden;border:2.5px solid #fff;box-shadow:0 8px 22px rgba(11,18,32,.4);background:#0b1220"><img src="${safe}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover" /></div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
  });
}

export function CommunityMap({ photoPins, className }: CommunityMapProps) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sizeTick, setSizeTick] = useState(0);

  useEffect(() => setMounted(true), []);

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
    setSizeTick((t) => t + 1);
  }, [expanded, photoPins.length]);

  const displayPhotos = useMemo(() => spreadOverlappingPins(photoPins), [photoPins]);
  const photoIcons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const pin of photoPins) {
      map.set(pin.id, makePhotoThumbIcon(pin.imageUrl));
    }
    return map;
  }, [photoPins]);

  const fitPoints: BoundPoint[] = displayPhotos.map((p) => ({
    lat: p.displayLat,
    lng: p.displayLng,
  }));

  const personLabel = (pin: CommunityPhotoPin['author']) =>
    [pin.firstName, pin.lastName].filter(Boolean).join(' ') ||
    (pin.username ? `@${pin.username}` : 'Viaggiatore');

  const countLabel =
    photoPins.length === 0
      ? 'Nessuna foto georeferenziata'
      : `${photoPins.length} foto pubblicate`;

  const shell = (
    <section
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/80 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.75)]',
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
            Mappa foto
          </h2>
          <p className="text-xs text-white/50">{countLabel}</p>
        </div>
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/15"
            aria-label="Espandi mappa"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Espandi
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          'relative min-h-0 w-full flex-1 bg-[#dce6ee]',
          '[&_.leaflet-container]:h-full [&_.leaflet-container]:w-full',
          '[&_.leaflet-control-attribution]:!hidden',
          '[&_.leaflet-control-zoom]:border-0 [&_.leaflet-control-zoom]:overflow-hidden [&_.leaflet-control-zoom]:rounded-lg [&_.leaflet-control-zoom]:shadow-md',
          '[&_.leaflet-control-zoom-in]:!h-8 [&_.leaflet-control-zoom-in]:!w-8 [&_.leaflet-control-zoom-in]:!leading-8 [&_.leaflet-control-zoom-in]:!border-0 [&_.leaflet-control-zoom-in]:!bg-white/95',
          '[&_.leaflet-control-zoom-out]:!h-8 [&_.leaflet-control-zoom-out]:!w-8 [&_.leaflet-control-zoom-out]:!leading-8 [&_.leaflet-control-zoom-out]:!border-0 [&_.leaflet-control-zoom-out]:!bg-white/95',
          '[&_.leaflet-popup-content-wrapper]:rounded-xl [&_.leaflet-popup-content-wrapper]:border-0 [&_.leaflet-popup-content-wrapper]:shadow-xl',
          !expanded && 'h-[70vh] min-h-[420px] flex-none'
        )}
      >
        {expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-3 top-3 z-[2000] inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-slate-800 shadow-md transition hover:bg-slate-50"
            aria-label="Riduci mappa"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            Riduci
          </button>
        ) : null}

        {mounted ? (
          <MapContainer
            key={expanded ? 'full' : 'inline'}
            center={[20, 12]}
            zoom={2}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
            attributionControl={false}
            zoomControl
            preferCanvas
            worldCopyJump={false}
            maxBounds={[
              [-85, -180],
              [85, 180],
            ]}
            maxBoundsViscosity={1}
          >
            <TileLayer url={MAP_TILES.url} attribution={MAP_TILES.attribution} noWrap />
            <MapResizeSync expanded={expanded} sizeTick={sizeTick} />
            <FitBounds points={fitPoints} />
            {displayPhotos.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.displayLat, pin.displayLng]}
                icon={photoIcons.get(pin.id) ?? makePhotoThumbIcon(pin.imageUrl)}
              >
                <Popup>
                  <div className="w-[200px] space-y-1.5 text-sm text-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pin.imageUrl}
                      alt=""
                      className="h-32 w-full rounded-lg object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <p className="font-semibold">{personLabel(pin.author)}</p>
                    {pin.label ? <p className="text-xs text-slate-500">{pin.label}</p> : null}
                    {pin.href ? (
                      <Link
                        href={pin.href}
                        className="text-xs font-medium text-[#2f6f82] hover:underline"
                      >
                        Vedi profilo
                      </Link>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Caricamento mappa…
          </div>
        )}
      </div>
    </section>
  );

  const fullscreen =
    expanded && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[#0f1c24] shadow-2xl ring-1 ring-white/10">
              {shell}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {expanded ? <div className={cn('h-[70vh] min-h-[420px]', className)} aria-hidden /> : shell}
      {fullscreen}
    </>
  );
}
