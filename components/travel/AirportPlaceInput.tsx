'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Building2, Globe2, Loader2, MapPin, Plane } from 'lucide-react';
import {
  placeDisplayValue,
  resolvePlaceExact,
  searchPlaceSuggestions,
  type PlaceKind,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
import type { PlaceResult } from '@/lib/places/types';
import { cn } from '@/lib/utils';

type AirportPlaceInputProps = {
  label: string;
  value: string;
  selected: PlaceSuggestion | null;
  onValueChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  onClearSelection?: () => void;
  placeholder?: string;
  className?: string;
  /** Default: tutti. Per hotel: città + paese */
  kinds?: PlaceKind[];
  /** Se false, in selezione mostra solo il nome città (senza codice IATA) */
  showAirportCode?: boolean;
  /**
   * Se true, integra suggerimenti Nominatim (cittadine / paesi piccoli)
   * oltre al catalogo aeroporti.
   */
  placesFallback?: boolean;
};

function KindIcon({ kind }: { kind: PlaceSuggestion['kind'] }) {
  if (kind === 'country') return <Globe2 className="h-4 w-4 text-primary" />;
  if (kind === 'airport') return <Plane className="h-4 w-4 text-slate-500" />;
  return <Building2 className="h-4 w-4 text-slate-500" />;
}

function placeResultToSuggestion(p: PlaceResult): PlaceSuggestion {
  const type = (p.placeType || '').toLowerCase();
  const isCountry =
    type === 'country' || type === 'state' || type === 'nation';
  const cc = (p.countryCode || 'XX').toUpperCase();
  return {
    id: `osm:${p.id}`,
    kind: isCountry ? 'country' : 'city',
    label: p.label,
    sublabel: p.subtitle || p.country || '',
    code: isCountry ? cc : cc,
    countryCode: cc,
    countryLabel: p.country || p.subtitle || cc,
  };
}

type MenuBox = { top: number; left: number; width: number };

function useDebounced(value: string, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function AirportPlaceInput({
  label,
  value,
  selected,
  onValueChange,
  onSelect,
  onClearSelection,
  placeholder = 'Città, aeroporto o paese',
  className,
  kinds,
  showAirportCode = true,
  placesFallback = false,
}: AirportPlaceInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuBox, setMenuBox] = useState<MenuBox | null>(null);
  const [mounted, setMounted] = useState(false);
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const debounced = useDebounced(value.trim(), 320);

  const catalogSuggestions = useMemo(() => {
    const all = searchPlaceSuggestions(value, kinds?.length ? 24 : 12);
    if (!kinds?.length) return all.slice(0, 8);
    return all.filter((p) => kinds.includes(p.kind)).slice(0, 8);
  }, [kinds, value]);

  useEffect(() => {
    if (!placesFallback) {
      setRemote([]);
      setRemoteLoading(false);
      return;
    }
    if (debounced.length < 2) {
      setRemote([]);
      setRemoteLoading(false);
      return;
    }
    let cancelled = false;
    setRemoteLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(debounced)}`,
          { credentials: 'same-origin' }
        );
        const data = (await res.json()) as {
          results?: PlaceResult[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setRemote([]);
          return;
        }
        const mapped = (data.results ?? [])
          .map(placeResultToSuggestion)
          .filter((p) => !kinds?.length || kinds.includes(p.kind));
        setRemote(mapped);
      } catch {
        if (!cancelled) setRemote([]);
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, placesFallback, kinds]);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: PlaceSuggestion[] = [];
    const push = (p: PlaceSuggestion) => {
      const key = `${p.kind}:${p.label.toLowerCase()}:${p.countryCode}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    };
    for (const p of catalogSuggestions) push(p);
    for (const p of remote) push(p);
    return out.slice(0, 14);
  }, [catalogSuggestions, remote]);

  const showList =
    open &&
    value.trim().length >= 2 &&
    (suggestions.length > 0 || remoteLoading);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [value, suggestions.length]);

  const updateMenuPosition = () => {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuBox({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  };

  useLayoutEffect(() => {
    if (!showList) {
      setMenuBox(null);
      return;
    }
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [showList, value, suggestions.length, remoteLoading]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const displayFor = (place: PlaceSuggestion) => {
    if (!showAirportCode && place.kind === 'airport') return place.label;
    return placeDisplayValue(place);
  };

  const pick = (place: PlaceSuggestion) => {
    onSelect(place);
    onValueChange(displayFor(place));
    setOpen(false);
  };

  const menu =
    mounted && showList && menuBox
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              top: menuBox.top,
              left: menuBox.left,
              width: menuBox.width,
              zIndex: 9999,
            }}
            className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-2xl shadow-slate-900/20"
          >
            {remoteLoading && suggestions.length === 0 ? (
              <li className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cerco luoghi…
              </li>
            ) : null}
            {suggestions.map((place, idx) => (
              <li key={place.id} role="option" aria-selected={idx === highlight}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-3 px-3 py-2.5 text-left transition',
                    idx === highlight ? 'bg-primary/8' : 'hover:bg-slate-50'
                  )}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(place)}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <KindIcon kind={place.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {place.kind === 'airport' && showAirportCode
                          ? `${place.label} (${place.code})`
                          : place.label}
                      </span>
                      {place.kind !== 'country' && showAirportCode ? (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-600">
                          {place.code}
                        </span>
                      ) : place.countryCode && place.countryCode !== 'XX' ? (
                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-600">
                          {place.countryCode}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                      {place.sublabel}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {remoteLoading && suggestions.length > 0 ? (
              <li className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Altri risultati…
              </li>
            ) : null}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={cn('relative space-y-1', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div ref={inputWrapRef} className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          className={cn(
            'flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-base font-semibold text-slate-900 outline-none transition',
            'placeholder:font-normal placeholder:text-slate-400',
            'focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20',
            selected ? 'border-primary/40' : null
          )}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onValueChange(e.target.value);
            onClearSelection?.();
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!showList || suggestions.length === 0) {
              if (e.key === 'Enter') {
                const exact = resolvePlaceExact(value);
                if (exact) {
                  e.preventDefault();
                  pick(exact);
                }
              }
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const place = suggestions[highlight];
              if (place) pick(place);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </div>
      {menu}
    </div>
  );
}
