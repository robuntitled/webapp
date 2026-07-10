'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Globe2,
  Loader2,
  MapPin,
  Mountain,
  Search,
  Sparkles,
  Trees,
} from 'lucide-react';
import {
  COMPOSER_DESTINATIONS,
  DESTINATION_REGIONS,
  featuredToMeta,
  filterDestinations,
  placeToMeta,
} from '@/lib/composer/destinations';
import type { ComposerDestination, DestinationMeta } from '@/types/composer';
import type { PlaceResult } from '@/lib/places/types';

type DestinationSearchProps = {
  selectedLabel: string;
  selectedMeta?: DestinationMeta;
  onSelect: (label: string, meta: DestinationMeta) => void;
};

function placeIcon(type: string) {
  if (type === 'country' || type === 'state' || type === 'region') return Globe2;
  if (type === 'village' || type === 'hamlet' || type === 'town') return Trees;
  if (type === 'city') return Building2;
  if (type === 'island' || type === 'archipelago') return Mountain;
  return MapPin;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function DestinationSearch({
  selectedLabel,
  selectedMeta,
  onSelect,
}: DestinationSearchProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 320);

  const featured = useMemo(() => {
    let list = filterDestinations(query);
    if (regionFilter) list = list.filter((d) => d.region === regionFilter);
    return list;
  }, [query, regionFilter]);

  const showApiSearch = debouncedQuery.trim().length >= 2;

  const fetchPlaces = useCallback(async (q: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setApiResults([]);
        setApiError(data.error ?? 'Errore ricerca');
        return;
      }
      setApiResults(data.results ?? []);
    } catch {
      setApiResults([]);
      setApiError('Connessione non disponibile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showApiSearch) {
      setApiResults([]);
      setApiError(null);
      return;
    }
    void fetchPlaces(debouncedQuery.trim());
  }, [debouncedQuery, showApiSearch, fetchPlaces]);

  const selectFeatured = (dest: ComposerDestination) => {
    const meta = featuredToMeta(dest);
    onSelect(dest.label, meta);
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  };

  const selectPlace = (place: PlaceResult) => {
    const meta = placeToMeta(place);
    const label = place.subtitle ? `${place.label}, ${place.subtitle}` : place.label;
    onSelect(label, meta);
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  };

  const showDropdown = focused && (showApiSearch || query.length > 0 || regionFilter);

  return (
    <div className="space-y-5">
      <div className="relative">
        <div
          className={`composer-search-glow rounded-2xl transition-all duration-500 ${
            focused ? 'composer-search-glow-active' : ''
          }`}
        >
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-white/40 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 180)}
              placeholder="Cerca qualsiasi luogo nel mondo — città, paese, isola..."
              className="composer-search-input w-full h-14 pl-12 pr-12 rounded-2xl text-base text-white placeholder:text-white/35 bg-white/[0.04] border border-white/10 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="absolute right-4 h-5 w-5 text-accent animate-spin" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 w-full composer-glass rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 max-h-[min(420px,60vh)] overflow-y-auto"
            >
              {showApiSearch && (
                <div className="p-2">
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Risultati nel mondo
                  </p>
                  {loading && apiResults.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-white/50">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-accent" />
                      Ricerca in corso...
                    </div>
                  )}
                  {apiError && (
                    <p className="px-3 py-4 text-sm text-rose-300/80">{apiError}</p>
                  )}
                  {!loading && !apiError && apiResults.length === 0 && (
                    <p className="px-3 py-4 text-sm text-white/50">
                      Nessun risultato — prova con il nome del paese
                    </p>
                  )}
                  {apiResults.map((place) => {
                    const Icon = placeIcon(place.placeType);
                    return (
                      <button
                        key={place.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectPlace(place)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] group-hover:bg-accent/15 transition-colors">
                          <Icon className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate">{place.label}</p>
                          <p className="text-xs text-white/45 truncate">{place.subtitle}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/30 bg-white/[0.06] px-2 py-1 rounded-full">
                          {place.placeTypeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {featured.length > 0 && (
                <div className={`p-2 ${showApiSearch && apiResults.length > 0 ? 'border-t border-white/8' : ''}`}>
                  {!showApiSearch && (
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                      Mete in evidenza
                    </p>
                  )}
                  {featured.slice(0, showApiSearch ? 4 : 8).map((dest) => (
                    <button
                      key={dest.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectFeatured(dest)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors"
                    >
                      <span className="text-xl">{dest.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white text-sm">{dest.label}</p>
                        <p className="text-xs text-white/40">{dest.vibe}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!query && !selectedLabel && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRegionFilter(null)}
              className={`composer-chip ${regionFilter === null ? 'composer-chip-active' : ''}`}
            >
              Tutte
            </button>
            {DESTINATION_REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setRegionFilter(region === regionFilter ? null : region)}
                className={`composer-chip ${regionFilter === region ? 'composer-chip-active' : ''}`}
              >
                {region}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featured.map((dest, i) => {
              const selected = selectedLabel === dest.label;
              return (
                <motion.button
                  key={dest.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                  onClick={() => selectFeatured(dest)}
                  className={`composer-dest-card group relative overflow-hidden rounded-2xl text-left aspect-[4/5] ${
                    selected ? 'composer-dest-card-selected' : ''
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${dest.gradient} opacity-80 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col justify-end p-4">
                    <span className="text-3xl mb-2 drop-shadow-lg">{dest.emoji}</span>
                    <p className="font-display text-lg font-semibold text-white leading-tight">
                      {dest.label}
                    </p>
                    <p className="text-[11px] text-white/65 mt-1">{dest.vibe}</p>
                    <span className="mt-2 inline-flex w-fit items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/50">
                      <Sparkles className="h-3 w-3" />
                      {dest.region}
                    </span>
                  </div>
                  {selected && (
                    <motion.div
                      layoutId="dest-ring"
                      className="absolute inset-0 rounded-2xl ring-2 ring-accent ring-offset-2 ring-offset-transparent pointer-events-none"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {selectedLabel && selectedMeta && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="composer-selected-hero rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-2xl">
            📍
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-accent/80 mb-0.5">
              Meta selezionata
            </p>
            <p className="font-display text-xl font-semibold text-white truncate">
              {selectedMeta.label}
            </p>
            <p className="text-sm text-white/50 truncate">
              {selectedMeta.subtitle || selectedMeta.country}
              {selectedMeta.placeTypeLabel ? ` · ${selectedMeta.placeTypeLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect('', { label: '', lat: 0, lng: 0 });
              setQuery('');
              inputRef.current?.focus();
            }}
            className="shrink-0 text-xs text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/25"
          >
            Cambia
          </button>
        </motion.div>
      )}
    </div>
  );
}