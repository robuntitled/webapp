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
      map.setView([30, 10], 2);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 6);
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.fitBounds(bounds.pad(0.2), { maxZoom: 8 });
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
  const ring = isMe ? '#e8a87c' : '#2f6f82';
  const safe = imageUrl?.replace(/"/g, '') ?? '';
  const inner = safe
    ? `<img src="${safe}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" />`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#1a3344;color:#fff;font-size:11px;font-weight:700">NL</span>`;
  return L.divIcon({
    className: 'community-map-marker',
    html: `<div style="
      width:36px;height:36px;border-radius:9999px;overflow:hidden;
      border:2.5px solid ${ring};box-shadow:0 4px 14px rgba(15,23,42,0.35);
      background:#0f172a;
    ">${inner}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function makePhotoIcon(imageUrl: string) {
  const safe = imageUrl.replace(/"/g, '');
  return L.divIcon({
    className: 'community-photo-marker',
    html: `<div style="
      width:44px;height:44px;border-radius:12px;overflow:hidden;
      border:2.5px solid #fff;box-shadow:0 4px 16px rgba(15,23,42,0.4);
      background:#0f172a;
    "><img src="${safe}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

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

  const photoIcons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const pin of photoPins) {
      map.set(pin.id, makePhotoIcon(pin.imageUrl));
    }
    return map;
  }, [photoPins]);

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
        ? 'Nessuna foto georeferenziata. Aggiungi una foto con GPS o tagga la posizione.'
        : `${photoPins.length} foto sulla mappa`;

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
        'relative min-h-0 w-full flex-1 bg-slate-900/40 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-control-attribution]:!hidden',
        !expanded && 'h-[280px] sm:h-[340px] flex-none'
      )}
    >
      {mounted ? (
        <MapContainer
          key={`${tab}-${expanded ? 'full' : 'inline'}`}
          center={[30, 10]}
          zoom={2}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          attributionControl={false}
          zoomControl
        >
          <TileLayer url={CARTO_URL} />
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
                    <div className="min-w-[140px] space-y-1 text-sm">
                      <p className="font-semibold text-slate-900">
                        {personLabel(pin)}
                        {pin.id === currentUserId ? ' (tu)' : ''}
                      </p>
                      {pin.label ? (
                        <p className="text-xs text-slate-600">{pin.label}</p>
                      ) : null}
                      {pin.href ? (
                        <Link
                          href={pin.href}
                          className="text-xs font-medium text-[#2f6f82] underline-offset-2 hover:underline"
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
                  icon={photoIcons.get(pin.id)}
                >
                  <Popup>
                    <div className="w-[180px] space-y-1.5 text-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pin.imageUrl}
                        alt=""
                        className="h-28 w-full rounded-lg object-cover"
                      />
                      <p className="font-semibold text-slate-900">
                        {personLabel(pin.author)}
                      </p>
                      {pin.label ? (
                        <p className="text-xs text-slate-600">{pin.label}</p>
                      ) : null}
                      {pin.body ? (
                        <p className="line-clamp-2 text-xs text-slate-700">
                          {pin.body}
                        </p>
                      ) : null}
                      {pin.href ? (
                        <Link
                          href={pin.href}
                          className="text-xs font-medium text-[#2f6f82] underline-offset-2 hover:underline"
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
