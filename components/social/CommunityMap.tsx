'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Camera,
  Maximize2,
  Minimize2,
  Navigation,
  EyeOff,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import {
  hideMyMapLocation,
  shareMyMapLocation,
} from '@/actions/community-location';
import type {
  CommunityMapPin,
  CommunityPhotoPin,
  MyMapLocation,
} from '@/lib/data/community-map';
import { cn } from '@/lib/utils';

/** Stile chiaro tipo travel (Carto Voyager). */
const CARTO_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

type MapTab = 'people' | 'photos';

type CommunityMapProps = {
  pins: CommunityMapPin[];
  photoPins: CommunityPhotoPin[];
  me: MyMapLocation | null;
  currentUserId: string;
  className?: string;
};

type BoundPoint = { lat: number; lng: number };

function FitBounds({ points }: { points: BoundPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView([28, 12], 2, { animate: true });
      return;
    }
    if (points.length === 1) {
      map.flyTo([points[0].lat, points[0].lng], 6, { duration: 0.7 });
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.flyToBounds(bounds.pad(0.2), { maxZoom: 7, duration: 0.75 });
  }, [map, points]);
  return null;
}

function MapResizeSync({
  expanded,
  sizeTick,
}: {
  expanded: boolean;
  sizeTick: number;
}) {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false, pan: false });
    run();
    const raf = requestAnimationFrame(run);
    const t1 = window.setTimeout(run, 80);
    const t2 = window.setTimeout(run, 250);
    const el = map.getContainer().parentElement;
    const ro =
      el && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => run())
        : null;
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

function makeAvatarIcon(imageUrl: string | null, isMe: boolean) {
  const ring = isMe ? '#e8a87c' : '#2f6f82';
  const safe = imageUrl?.replace(/"/g, '') ?? '';
  const inner = safe
    ? `<img src="${safe}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" />`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#1a3344;color:#fff;font-size:11px;font-weight:700">NL</span>`;
  return L.divIcon({
    className: 'community-map-marker',
    html: `<div style="width:36px;height:36px;border-radius:9999px;overflow:hidden;border:2.5px solid ${ring};box-shadow:0 4px 14px rgba(15,23,42,0.28);background:#fff">${inner}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function makePhotoIcon() {
  return L.divIcon({
    className: 'community-photo-marker',
    html: `<div style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#2f6f82;border:2px solid #fff;box-shadow:0 4px 14px rgba(15,23,42,0.3)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

const PHOTO_ICON = makePhotoIcon();

export function CommunityMap({
  pins,
  photoPins,
  me,
  currentUserId,
  className,
}: CommunityMapProps) {
  const router = useRouter();
  const [tab, setTab] = useState<MapTab>('people');
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
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
  }, [expanded, tab, pins.length, photoPins.length]);

  const visible = me?.visible && me.lat != null && me.lng != null;

  const personLabel = (pin: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  }) =>
    [pin.firstName, pin.lastName].filter(Boolean).join(' ') ||
    (pin.username ? `@${pin.username}` : 'Viaggiatore');

  const personIcons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const pin of pins) {
      map.set(pin.id, makeAvatarIcon(pin.image, pin.id === currentUserId));
    }
    return map;
  }, [pins, currentUserId]);

  const fitPoints: BoundPoint[] =
    tab === 'people'
      ? pins.map((p) => ({ lat: p.lat, lng: p.lng }))
      : photoPins.map((p) => ({ lat: p.lat, lng: p.lng }));

  async function onShare() {
    if (!navigator.geolocation) {
      toast.error('Geolocalizzazione non supportata su questo dispositivo.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await shareMyMapLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(
            res.label
              ? `Sei sulla mappa: ${res.label}`
              : 'Posizione condivisa sulla mappa community.'
          );
          router.refresh();
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? 'Permesso posizione negato. Abilitalo nelle impostazioni del browser.'
            : 'Impossibile rilevare la posizione.'
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60_000 }
    );
  }

  async function onHide() {
    setBusy(true);
    try {
      const res = await hideMyMapLocation();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Posizione nascosta dalla mappa.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const countLabel =
    tab === 'people'
      ? pins.length === 0
        ? 'Nessun viaggiatore in mappa'
        : `${pins.length} viaggiatori`
      : photoPins.length === 0
        ? 'Nessuna foto georeferenziata'
        : `${photoPins.length} foto`;

  const shell = (
    <section
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5',
        !expanded && 'rounded-3xl nl-feed-card',
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold tracking-tight text-white sm:text-lg">
              Mappa community
            </h2>
            <span className="hidden text-xs text-white/45 sm:inline">
              · {countLabel}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setTab('people')}
              className={cn(
                'inline-flex items-center gap-1.5 pb-0.5 transition',
                tab === 'people'
                  ? 'border-b-2 border-accent font-medium text-white'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Viaggiatori
            </button>
            <button
              type="button"
              onClick={() => setTab('photos')}
              className={cn(
                'inline-flex items-center gap-1.5 pb-0.5 transition',
                tab === 'photos'
                  ? 'border-b-2 border-accent font-medium text-white'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Camera className="h-3.5 w-3.5" />
              Foto
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {tab === 'people' ? (
            visible ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onHide()}
                className="h-8 gap-1.5 px-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                <EyeOff className="h-3.5 w-3.5" />
                Nascondi
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void onShare()}
                className="h-8 gap-1.5 rounded-full px-3 text-xs"
              >
                <Navigation className="h-3.5 w-3.5" />
                {busy ? '…' : 'Condividi'}
              </Button>
            )
          ) : null}
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
      </div>

      <div
        className={cn(
          'relative min-h-0 w-full flex-1 bg-[#e8eef2]',
          '[&_.leaflet-container]:h-full [&_.leaflet-container]:w-full',
          '[&_.leaflet-control-attribution]:!hidden',
          '[&_.leaflet-control-zoom]:border-0 [&_.leaflet-control-zoom]:overflow-hidden [&_.leaflet-control-zoom]:rounded-lg [&_.leaflet-control-zoom]:shadow-md',
          '[&_.leaflet-control-zoom-in]:!h-8 [&_.leaflet-control-zoom-in]:!w-8 [&_.leaflet-control-zoom-in]:!leading-8 [&_.leaflet-control-zoom-in]:!border-0 [&_.leaflet-control-zoom-in]:!bg-white/95',
          '[&_.leaflet-control-zoom-out]:!h-8 [&_.leaflet-control-zoom-out]:!w-8 [&_.leaflet-control-zoom-out]:!leading-8 [&_.leaflet-control-zoom-out]:!border-0 [&_.leaflet-control-zoom-out]:!bg-white/95',
          '[&_.leaflet-popup-content-wrapper]:rounded-xl [&_.leaflet-popup-content-wrapper]:border-0 [&_.leaflet-popup-content-wrapper]:shadow-xl',
          !expanded && 'h-[280px] flex-none sm:h-[340px]'
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
            key={`${tab}-${expanded ? 'full' : 'inline'}`}
            center={[28, 12]}
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
            <TileLayer url={CARTO_URL} noWrap />
            <MapResizeSync expanded={expanded} sizeTick={sizeTick} />
            <FitBounds points={fitPoints} />
            {tab === 'people'
              ? pins.map((pin) => (
                  <Marker
                    key={pin.id}
                    position={[pin.lat, pin.lng]}
                    icon={personIcons.get(pin.id)}
                  >
                    <Popup>
                      <div className="min-w-[130px] space-y-1 text-sm text-slate-900">
                        <p className="font-semibold">
                          {personLabel(pin)}
                          {pin.id === currentUserId ? ' (tu)' : ''}
                        </p>
                        {pin.label ? (
                          <p className="text-xs text-slate-500">{pin.label}</p>
                        ) : null}
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
                ))
              : photoPins.map((pin) => (
                  <Marker
                    key={pin.id}
                    position={[pin.lat, pin.lng]}
                    icon={PHOTO_ICON}
                  >
                    <Popup>
                      <div className="w-[180px] space-y-1.5 text-sm text-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pin.imageUrl}
                          alt=""
                          className="h-28 w-full rounded-lg object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <p className="font-semibold">
                          {personLabel(pin.author)}
                        </p>
                        {pin.label ? (
                          <p className="text-xs text-slate-500">{pin.label}</p>
                        ) : null}
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

  // Portal su body: evita che navbar/overflow della bacheca taglino l’angolo in alto a sinistra
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
      {expanded ? (
        <div
          className={cn('h-[280px] sm:h-[340px]', className)}
          aria-hidden
        />
      ) : (
        shell
      )}
      {fullscreen}
    </>
  );
}
