'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  ExternalLink,
  Landmark,
  Maximize2,
  Minimize2,
  Star,
  X,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getLeafletTileLayer } from '@/lib/maps/tile-layer';
import { cn } from '@/lib/utils';

export type HotelMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  price?: number;
  currency?: string;
  imageUrl?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  subtitle?: string | null;
  bookingUrl?: string;
  ctaLabel?: string;
};

/** Alias generico (hotel / attività / attrazioni) */
export type ResultsMapPin = HotelMapPin;

type HotelsResultsMapProps = {
  pins: HotelMapPin[];
  highlightedId?: string | null;
  onPinClick?: (id: string) => void;
  /** Prenota in-app (hotel) quando non c’è bookingUrl */
  onBookClick?: (id: string) => void;
  className?: string;
  emptyLabel?: string;
  /** Mostra pulsante espandi fullscreen (default true) */
  expandable?: boolean;
};

const MAP_TILES = getLeafletTileLayer();

function formatPrice(amount: number | undefined, currency?: string) {
  if (amount == null || Number.isNaN(amount)) return null;
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency || 'EUR'}`;
  }
}

function makeIcon(highlighted: boolean, priceLabel?: string) {
  const bg = highlighted ? '#2f6f82' : '#1a3344';
  const ring = highlighted ? '0 0 0 3px rgba(47,111,130,0.28)' : '0 4px 14px rgba(15,23,42,0.28)';
  const label = priceLabel
    ? `<span style="font-size:10px;font-weight:700;letter-spacing:0.01em;color:#fff;white-space:nowrap">${priceLabel}</span>`
    : `<span style="width:8px;height:8px;border-radius:50%;background:#fff;display:block"></span>`;
  return L.divIcon({
    className: 'hotel-map-marker',
    html: `<div style="
      background:${bg};
      border:2px solid #fff;
      border-radius:999px;
      padding:5px 9px;
      box-shadow:${ring};
      display:flex;align-items:center;justify-content:center;
      min-width:30px;min-height:30px;
      transition: transform 120ms ease;
      transform: ${highlighted ? 'scale(1.08)' : 'scale(1)'};
    ">${label}</div>`,
    iconSize: [44, 34],
    iconAnchor: [22, 34],
    popupAnchor: [0, -34],
  });
}

function FitPins({ pins }: { pins: HotelMapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pins.length) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13, { animate: false });
      requestAnimationFrame(() => map.invalidateSize());
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.18), { animate: false });
    requestAnimationFrame(() => map.invalidateSize());
  }, [map, pins]);
  return null;
}

/** Ricarica tile dopo resize / pan — evita aree grigie in fullscreen. */
function MapHealth({ tick }: { tick: number }) {
  const map = useMap();
  useEffect(() => {
    const repair = () => {
      map.invalidateSize({ pan: false });
    };
    const t1 = window.setTimeout(repair, 50);
    const t2 = window.setTimeout(repair, 220);
    const t3 = window.setTimeout(repair, 500);
    map.on('moveend', repair);
    map.on('zoomend', repair);
    map.on('resize', repair);
    window.addEventListener('resize', repair);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      map.off('moveend', repair);
      map.off('zoomend', repair);
      map.off('resize', repair);
      window.removeEventListener('resize', repair);
    };
  }, [map, tick]);
  return null;
}

function FocusPin({
  pin,
  bottomPad,
}: {
  pin: HotelMapPin | null;
  bottomPad: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    // Sposta il pin verso l’alto così resta sopra la scheda floating
    const target = map.project([pin.lat, pin.lng], map.getZoom());
    const shifted = L.point(target.x, target.y + bottomPad / 2);
    const latlng = map.unproject(shifted, map.getZoom());
    map.panTo(latlng, { animate: true, duration: 0.35 });
    const t = window.setTimeout(() => map.invalidateSize({ pan: false }), 380);
    return () => window.clearTimeout(t);
  }, [map, pin, bottomPad]);
  return null;
}

function MapPinCard({
  pin,
  onBookClick,
  onClose,
  compact,
}: {
  pin: HotelMapPin;
  onBookClick?: (id: string) => void;
  onClose: () => void;
  compact?: boolean;
}) {
  const price = formatPrice(pin.price, pin.currency);
  const cta = pin.ctaLabel ?? 'Prenota';
  const canBook = Boolean(pin.bookingUrl || onBookClick);
  const pricePrefix = pin.bookingUrl ? 'da ' : '';

  const ctaEl = canBook ? (
    pin.bookingUrl ? (
      <a
        href={pin.bookingUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={cn(
          'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#1a3344] px-4 text-sm font-semibold text-white no-underline shadow-lg shadow-slate-900/20 transition hover:bg-[#243f52] hover:shadow-xl',
          !price && 'w-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {cta}
        <ExternalLink className="h-3.5 w-3.5 opacity-90" />
      </a>
    ) : (
      <button
        type="button"
        className={cn(
          'inline-flex h-11 items-center justify-center rounded-xl bg-[#1a3344] px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#243f52] hover:shadow-xl',
          !price && 'w-full'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onBookClick?.(pin.id);
        }}
      >
        {cta}
      </button>
    )
  ) : null;

  return (
    <article
      className={cn(
        'nl-map-float-card pointer-events-auto overflow-hidden rounded-2xl bg-white text-slate-900',
        'shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55),0_0_0_1px_rgba(15,23,42,0.06)]',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        compact ? 'w-[min(100%,340px)]' : 'w-[min(100%,420px)]'
      )}
    >
      <div className={cn('relative', compact ? 'h-[128px]' : 'h-[152px]')}>
        {pin.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pin.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50">
            <Landmark className="h-10 w-10 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />

        <button
          type="button"
          aria-label="Chiudi scheda"
          onClick={onClose}
          className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {pin.rating != null ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {pin.rating.toFixed(1)}
            {pin.ratingCount != null ? (
              <span className="font-medium text-slate-500">
                ({pin.ratingCount.toLocaleString('it-IT')})
              </span>
            ) : null}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-3.5 pt-8">
          {pin.subtitle ? (
            <p className="mb-0.5 line-clamp-1 text-[11px] font-medium tracking-wide text-white/75">
              {pin.subtitle}
            </p>
          ) : null}
          <h3 className="m-0 line-clamp-2 font-sans text-[17px] font-semibold leading-snug tracking-tight text-white">
            {pin.name}
          </h3>
        </div>
      </div>

      {price || ctaEl ? (
        <div
          className={cn(
            'flex items-center gap-3 p-3',
            !price && ctaEl && 'pt-2.5'
          )}
        >
          {price ? (
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                {pin.bookingUrl ? 'A partire da' : 'Totale'}
              </p>
              <p className="m-0 mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                {pricePrefix}
                {price}
              </p>
            </div>
          ) : null}
          {ctaEl}
        </div>
      ) : null}
    </article>
  );
}

function MapCanvas({
  pins,
  highlightedId,
  selectedId,
  onSelect,
  onBookClick,
  onClearSelection,
  scrollZoom,
  sizeTick,
  floatingCompact,
}: {
  pins: HotelMapPin[];
  highlightedId?: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBookClick?: (id: string) => void;
  onClearSelection: () => void;
  scrollZoom: boolean;
  sizeTick: number;
  floatingCompact?: boolean;
}) {
  const center: [number, number] = [pins[0].lat, pins[0].lng];
  const selected = useMemo(
    () => pins.find((p) => p.id === selectedId) ?? null,
    [pins, selectedId]
  );
  const activeId = selectedId ?? highlightedId ?? null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={scrollZoom}
        attributionControl={false}
        className="h-full w-full min-h-[280px] bg-[#e8eef2]"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          url={MAP_TILES.url}
          attribution={MAP_TILES.attribution}
          keepBuffer={4}
          updateWhenZooming={false}
          updateWhenIdle
        />
        <FitPins pins={pins} />
        <MapHealth tick={sizeTick} />
        <FocusPin pin={selected} bottomPad={floatingCompact ? 160 : 200} />
        {pins.map((p) => {
          const priceLabel =
            p.price != null
              ? `${Math.round(p.price)}${p.currency === 'EUR' ? '€' : ''}`
              : undefined;
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={makeIcon(activeId === p.id, priceLabel)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e.originalEvent);
                  onSelect(p.id);
                },
              }}
            />
          );
        })}
      </MapContainer>

      {selected ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex justify-center p-3 sm:p-4">
          <MapPinCard
            pin={selected}
            onBookClick={onBookClick}
            onClose={onClearSelection}
            compact={floatingCompact}
          />
        </div>
      ) : null}
    </div>
  );
}

export function HotelsResultsMap({
  pins,
  highlightedId,
  onPinClick,
  onBookClick,
  className,
  emptyLabel = 'Coordinate non disponibili per questa ricerca',
  expandable = true,
}: HotelsResultsMapProps) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sizeTick, setSizeTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedId) setSelectedId(null);
        else setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey);
    setSizeTick((t) => t + 1);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded, selectedId]);

  useEffect(() => {
    setSizeTick((t) => t + 1);
  }, [expanded, pins.length]);

  useEffect(() => {
    // Se i pin cambiano (nuova ricerca), chiudi scheda orfana
    if (selectedId && !pins.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [pins, selectedId]);

  const selectPin = (id: string) => {
    setSelectedId(id);
    onPinClick?.(id);
    setSizeTick((t) => t + 1);
  };

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

  const closeExpanded = () => {
    setExpanded(false);
    setSelectedId(null);
  };

  const toggle = (
    <button
      type="button"
      onClick={() => {
        if (expanded) closeExpanded();
        else {
          setExpanded(true);
          setSelectedId(null);
        }
      }}
      className="absolute right-2.5 top-2.5 z-[2000] inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 bg-background/95 px-2.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition hover:bg-muted"
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

  const inlineMap = (
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
        selectedId={selectedId}
        onSelect={selectPin}
        onBookClick={onBookClick}
        onClearSelection={() => setSelectedId(null)}
        scrollZoom={false}
        sizeTick={sizeTick}
        floatingCompact
      />
    </div>
  );

  const fullscreenOverlay =
    expanded && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold text-slate-900">
                Mappa · {pins.length} {pins.length === 1 ? 'hotel' : 'hotel'}
              </p>
              <button
                type="button"
                onClick={closeExpanded}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Riduci
              </button>
            </header>
            <div className="relative min-h-0 flex-1">
              <MapCanvas
                pins={pins}
                highlightedId={highlightedId}
                selectedId={selectedId}
                onSelect={selectPin}
                onBookClick={onBookClick}
                onClearSelection={() => setSelectedId(null)}
                scrollZoom
                sizeTick={sizeTick}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {expanded ? (
        <div
          className={cn('min-h-[280px] rounded-2xl border border-dashed border-transparent', className)}
          aria-hidden
        />
      ) : (
        inlineMap
      )}
      {fullscreenOverlay}
    </>
  );
}
