'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PlaceResult } from '@/lib/places/types';
import { cn } from '@/lib/utils';

type MapSearchBarProps = {
  /** Bias opzionale (es. nome destinazione viaggio). */
  biasQuery?: string;
  /** Bias geografico: centro della meta (risultati vicini prima). */
  lat?: number;
  lng?: number;
  onSelect: (place: PlaceResult) => void;
  className?: string;
  compact?: boolean;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function MapSearchBar({
  biasQuery,
  lat,
  lng,
  onSelect,
  className,
  compact,
}: MapSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 320);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: q.trim() });
        if (typeof lat === 'number' && typeof lng === 'number') {
          params.set('lat', String(lat));
          params.set('lng', String(lng));
        }
        const res = await fetch(`/api/places/search?${params}`, {
          credentials: 'same-origin',
        });
        const data = (await res.json()) as { results?: PlaceResult[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [lat, lng]
  );

  useEffect(() => {
    if (!open) return;
    void search(debounced);
  }, [debounced, open, search]);

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className={cn('pointer-events-auto relative w-full max-w-md', className)}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border border-white/15 bg-[#0b1120]/92 shadow-2xl backdrop-blur-md',
          compact ? 'h-10 px-3' : 'h-11 px-3.5'
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-accent" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          placeholder={
            biasQuery
              ? `Cerca zona o luogo (es. vicino a ${biasQuery})…`
              : 'Cerca zona o luogo sulla mappa…'
          }
          className="h-full flex-1 border-0 bg-transparent px-0 text-sm text-white shadow-none placeholder:text-white/35 focus-visible:ring-0"
        />
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/50" />
        ) : query ? (
          <button
            type="button"
            onClick={clear}
            className="rounded-full p-0.5 text-white/40 hover:text-white"
            aria-label="Pulisci ricerca"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-2xl border border-white/12 bg-[#0b1120]/96 py-1 shadow-2xl backdrop-blur-xl">
          {results.slice(0, 8).map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="w-full px-3.5 py-2.5 text-left transition-colors hover:bg-white/8"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(place.label);
                  setOpen(false);
                  onSelect(place);
                }}
              >
                <p className="truncate text-sm font-medium text-white">{place.label}</p>
                {place.subtitle ? (
                  <p className="truncate text-[11px] text-white/40">{place.subtitle}</p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
