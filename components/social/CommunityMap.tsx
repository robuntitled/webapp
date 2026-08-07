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
import { MapPin, Maximize2, Minimize2, Navigation, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import {
  hideMyMapLocation,
  shareMyMapLocation,
} from '@/actions/community-location';
import type { CommunityMapPin, MyMapLocation } from '@/lib/data/community-map';
import { cn } from '@/lib/utils';

const CARTO_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

type CommunityMapProps = {
  pins: CommunityMapPin[];
  me: MyMapLocation | null;
  currentUserId: string;
  className?: string;
};

function FitBounds({ pins }: { pins: CommunityMapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) {
      map.setView([30, 10], 2);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 6);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 8 });
  }, [map, pins]);
  return null;
}

function makeAvatarIcon(imageUrl: string | null, isMe: boolean) {
  const ring = isMe ? '#e8a87c' : '#2f6f82';
  const inner = imageUrl
    ? `<img src="${imageUrl.replace(/"/g, '')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" />`
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

export function CommunityMap({
  pins,
  me,
  currentUserId,
  className,
}: CommunityMapProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const visible = me?.visible && me.lat != null && me.lng != null;

  const displayName = (pin: CommunityMapPin) =>
    [pin.firstName, pin.lastName].filter(Boolean).join(' ') ||
    (pin.username ? `@${pin.username}` : 'Viaggiatore');

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const pin of pins) {
      map.set(pin.id, makeAvatarIcon(pin.image, pin.id === currentUserId));
    }
    return map;
  }, [pins, currentUserId]);

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

  return (
    <section
      className={cn(
        'overflow-hidden rounded-3xl nl-feed-card',
        expanded && 'fixed inset-3 z-[80] rounded-2xl',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-white">
            <MapPin className="h-4 w-4 text-accent" />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Mappa community
            </h2>
          </div>
          <p className="text-xs text-white/65">
            {pins.length === 0
              ? 'Nessun viaggiatore in mappa. Condividi la tua posizione (opt-in).'
              : `${pins.length} viaggiatore${pins.length === 1 ? '' : 'i'} visibil${pins.length === 1 ? 'e' : 'i'}`}
            {' · '}posizione approssimata (~1 km)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {visible ? (
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
          )}
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

      <div
        className={cn(
          'relative w-full bg-slate-900/40',
          expanded ? 'h-[calc(100%-4.5rem)]' : 'h-[280px] sm:h-[340px]'
        )}
      >
        {mounted ? (
          <MapContainer
            center={[30, 10]}
            zoom={2}
            className="h-full w-full"
            scrollWheelZoom
            attributionControl
          >
            <TileLayer url={CARTO_URL} attribution={CARTO_ATTR} />
            <FitBounds pins={pins} />
            {pins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={icons.get(pin.id)}
              >
                <Popup>
                  <div className="min-w-[140px] space-y-1 text-sm">
                    <p className="font-semibold text-slate-900">
                      {displayName(pin)}
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
            ))}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            Caricamento mappa…
          </div>
        )}
      </div>
    </section>
  );
}
