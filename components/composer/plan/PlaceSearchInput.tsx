'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import type { PlaceResult } from '@/lib/places/types';

type PlaceSearchInputProps = {
  value: string;
  onChange: (place: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function PlaceSearchInput({
  value,
  onChange,
  placeholder = 'Cerca luogo...',
  className,
}: PlaceSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void search(debounced);
  }, [debounced, open, search]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
      <Input
        className={className}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-accent" />}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl overflow-hidden shadow-xl">
          {results.slice(0, 6).map((place) => (
            <button
              key={place.id}
              type="button"
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/8 transition-colors"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const label = place.subtitle ? `${place.label}, ${place.subtitle}` : place.label;
                setQuery(label);
                onChange(label, { lat: place.lat, lng: place.lng });
                setOpen(false);
              }}
            >
              <p className="text-white font-medium truncate">{place.label}</p>
              <p className="text-[10px] text-white/40 truncate">{place.subtitle}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}