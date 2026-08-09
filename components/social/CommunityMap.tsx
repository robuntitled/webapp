'use client';

import { useEffect, useMemo, useState } from 'react';
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
  MapPin,
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

/** Dark professional basemap (Carto Dark Matter). */
const CARTO_DARK_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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
      map.flyTo([points[0].lat, points[0].lng], 6, {
        duration: 0.75,
        easeLinearity: 0.25,
      });
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.flyToBounds(bounds.pad(0.22), {
      maxZoom: 7,
      duration: 0.85,
      easeLinearity: 0.25,
    });
  }, [map, points]);
  return null;
}

/** Ricalcola le dimensioni Leaflet dopo fullscreen / resize container. */
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
  const ring = isMe ? '#e8a87c' : '#3d8fa3';
  const safe = imageUrl?.replace(/"/g, '') ?? '';
  const inner = safe
    ? `<img src="${safe}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" />`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(145deg,#1a3344,#243f52);color:#fff;font-size:11px;font-weight:700">NL</span>`;
  return L.divIcon({
    className: 'community-map-marker',
    html: `<div style="
      width:38px;height:38px;border-radius:9999px;overflow:hidden;
      border:2.5px solid ${ring};
      box-shadow:0 6px 18px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08);
      background:#0f172a;
      transition: transform .15s ease;
    ">${inner}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

/** Pin leggero (niente download foto nel marker → mappa più fluida). */
function makePhotoIcon() {
  return L.divIcon({
    className: 'community-photo-marker',
    html: `<div style="
      width:34px;height:34px;border-radius:10px;
      display:flex;align-items:center;justify-content:center;
      background:linear-gradient(145deg,#2f6f82,#1a4a58);
      border:2px solid rgba(255,255,255,0.85);
      box-shadow:0 8px 20px rgba(0,0,0,0.5);
    "><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
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

  const subtitle =
    tab === 'people'
      ? pins.length === 0
        ? 'Nessun viaggiatore in mappa. Condividi la tua posizione (opt-in).'
        : `${pins.length} viaggiatore${pins.length === 1 ? '' : 'i'} · ~1 km`
      : photoPins.length === 0
        ? 'Nessuna foto georeferenziata. Usa il GPS dello scatto o cerca il luogo reale.'
        : `${photoPins.length} foto · luogo dello scatto`;

  const header = (
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2 text-white">
          <MapPin className="h-4 w-4 text-accent" />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Mappa community
          </h2>
        </div>
        <div className="flex gap-1 rounded-full bg-black/25 p-0.5">
          <button
            type="button"
            onClick={() => setTab('people')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
              tab === 'people'
                ? 'bg-white/15 text-white'
                : 'text-white/55 hover:text-white/80'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Viaggiatori
          </button>
          <button
            type="button"
            onClick={() => setTab('photos')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition',
              tab === 'photos'
                ? 'bg-white/15 text-white'
                : 'text-white/55 hover:text-white/80'
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            Foto
          </button>
        </div>
        <p className="text-xs text-white/65">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tab === 'people' ? (
          visible ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void onHide()}
              className="gap-1.5 bg-white/10 text-white hover:bg-white/15"
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
              className="gap-1.5"
            >
              <Navigation className="h-3.5 w-3.5" />
              {busy ? 'Attendi…' : 'Condividi posizione'}
            </Button>
          )
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Riduci mappa' : 'Espandi mappa'}
        >
          {expanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );

  const mapCanvas = (
    <div
      className={cn(
        'relative min-h-0 w-full flex-1 bg-[#0b1220]',
        '[&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:bg-[#0b1220]',
        '[&_.leaflet-control-attribution]:!hidden',
        '[&_.leaflet-control-zoom]:border-0 [&_.leaflet-control-zoom]:shadow-lg',
        '[&_.leaflet-control-zoom-in]:!bg-slate-900/90 [&_.leaflet-control-zoom-in]:!text-white [&_.leaflet-control-zoom-in]:!border-white/10',
        '[&_.leaflet-control-zoom-out]:!bg-slate-900/90 [&_.leaflet-control-zoom-out]:!text-white [&_.leaflet-control-zoom-out]:!border-white/10',
        '[&_.leaflet-popup-content-wrapper]:rounded-xl [&_.leaflet-popup-content-wrapper]:border [&_.leaflet-popup-content-wrapper]:border-white/10 [&_.leaflet-popup-content-wrapper]:bg-slate-950/95 [&_.leaflet-popup-content-wrapper]:text-white [&_.leaflet-popup-content-wrapper]:shadow-2xl',
        '[&_.leaflet-popup-tip]:bg-slate-950/95',
        !expanded && 'h-[300px] sm:h-[380px] flex-none'
      )}
    >
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
          zoomAnimation
          fadeAnimation
          markerZoomAnimation
          zoomSnap={0.5}
          zoomDelta={0.5}
          wheelPxPerZoomLevel={80}
        >
          <TileLayer
            url={CARTO_DARK_URL}
            keepBuffer={2}
            updateWhenIdle
            updateWhenZooming={false}
          />
          <MapResizeSync expanded={expanded} sizeTick={sizeTick} />
          <FitBounds points={fitPoints} />
          {tab === 'people'
            ? pins.map((pin) => (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  icon={personIcons.get(pin.id)}
                >
                  <Popup className="community-popup">
                    <div className="min-w-[140px] space-y-1 text-sm text-white">
                      <p className="font-semibold">
                        {personLabel(pin)}
                        {pin.id === currentUserId ? ' (tu)' : ''}
                      </p>
                      {pin.label ? (
                        <p className="text-xs text-white/55">{pin.label}</p>
                      ) : null}
                      {pin.href ? (
                        <Link
                          href={pin.href}
                          className="text-xs font-medium text-accent underline-offset-2 hover:underline"
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
                  <Popup className="community-popup">
                    <div className="w-[190px] space-y-1.5 text-sm text-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pin.imageUrl}
                        alt=""
                        className="h-28 w-full rounded-lg object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <p className="font-semibold">{personLabel(pin.author)}</p>
                      {pin.label ? (
                        <p className="text-xs text-white/55">{pin.label}</p>
                      ) : null}
                      {pin.body ? (
                        <p className="line-clamp-2 text-xs text-white/70">
                          {pin.body}
                        </p>
                      ) : null}
                      {pin.href ? (
                        <Link
                          href={pin.href}
                          className="text-xs font-medium text-accent underline-offset-2 hover:underline"
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
        <div className="flex h-full items-center justify-center text-sm text-white/50">
          Caricamento mappa…
        </div>
      )}
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950/50 p-2 backdrop-blur-[2px] sm:p-4">
        <section className="nl-feed-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
          {header}
          {mapCanvas}
        </section>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-3xl nl-feed-card',
        className
      )}
    >
      {header}
      {mapCanvas}
    </section>
  );
}
