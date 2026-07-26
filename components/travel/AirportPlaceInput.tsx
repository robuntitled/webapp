'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Building2, Globe2, MapPin, Plane } from 'lucide-react';
import {
  placeDisplayValue,
  resolvePlaceExact,
  searchPlaceSuggestions,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
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
};

function KindIcon({ kind }: { kind: PlaceSuggestion['kind'] }) {
  if (kind === 'country') return <Globe2 className="h-4 w-4 text-[#0770e3]" />;
  if (kind === 'airport') return <Plane className="h-4 w-4 text-slate-500" />;
  return <Building2 className="h-4 w-4 text-slate-500" />;
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
}: AirportPlaceInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(() => searchPlaceSuggestions(value, 12), [value]);

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (place: PlaceSuggestion) => {
    onSelect(place);
    onValueChange(placeDisplayValue(place));
    setOpen(false);
  };

  const showList = open && value.trim().length >= 2 && suggestions.length > 0;

  return (
    <div ref={rootRef} className={cn('relative space-y-1.5', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="relative">
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
            'focus:border-[#0770e3] focus:bg-white focus:ring-2 focus:ring-[#0770e3]/20',
            selected ? 'border-[#0770e3]/40' : null
          )}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onValueChange(e.target.value);
            onClearSelection?.();
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!showList) {
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

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
        >
          {suggestions.map((place, idx) => (
            <li key={place.id} role="option" aria-selected={idx === highlight}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-start gap-3 px-3 py-2.5 text-left transition',
                  idx === highlight ? 'bg-[#0770e3]/8' : 'hover:bg-slate-50'
                )}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => pick(place)}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <KindIcon kind={place.kind} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {place.kind === 'airport'
                        ? `${place.label} (${place.code})`
                        : place.label}
                    </span>
                    {place.kind !== 'country' ? (
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-600">
                        {place.code}
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
        </ul>
      ) : null}
    </div>
  );
}
