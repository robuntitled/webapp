'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { plainMapAttribution } from '@/lib/maps/tile-layer';

type Props = {
  /** Tile-layer attribution HTML or plain text (Esri / Carto / OSM). */
  attribution: string;
  className?: string;
};

/**
 * Discreet map-corner credits control.
 * Default Leaflet attribution bar is disabled; Esri/Carto/OSM credit stays
 * reachable via this accessible “i” toggle (legal requirement).
 */
export function MapCreditsControl({ attribution, className }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const credit = plainMapAttribution(attribution);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node | null;
      if (t && wrapRef.current && !wrapRef.current.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={cn('pointer-events-auto absolute bottom-2 right-2 z-[500]', className)}
      data-testid="map-credits-control"
    >
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Crediti mappa"
          className="absolute bottom-[calc(100%+6px)] right-0 w-max max-w-[min(16rem,70vw)] rounded-md border border-slate-200/80 bg-white/95 px-2.5 py-1.5 text-[10px] leading-snug text-slate-600 shadow-md backdrop-blur-sm"
          data-testid="map-credits-popover"
        >
          <p>{credit}</p>
          <p className="mt-0.5 text-slate-500">Leaflet</p>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Crediti mappa"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-[22px] w-[22px] items-center justify-center rounded-full',
          'bg-white/75 text-[11px] font-semibold italic leading-none text-slate-600',
          'shadow-sm ring-1 ring-slate-900/10 backdrop-blur-[2px]',
          'transition hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        )}
        data-testid="map-credits-button"
      >
        i
      </button>
    </div>
  );
}
