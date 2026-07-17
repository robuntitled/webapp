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
  X,
} from 'lucide-react';
import { DESTINATION_REGIONS, featuredToMeta, placeToMeta } from '@/lib/composer/destinations';
import {
  FEATURED_DESTINATION_COUNT,
  rankDestinationsForProfile,
} from '@/lib/composer/destination-suggestions';
import type { ComposerDestination, DestinationMeta } from '@/types/composer';
import type { PlaceResult } from '@/lib/places/types';
import type { PlannerProfile } from '@/types/planner';

type DestinationSearchProps = {
  selectedDestinations: DestinationMeta[];
  plannerProfile?: PlannerProfile | null;
  onDestinationsChange: (destinations: DestinationMeta[]) => void;
  onPersonalize: () => void;
};

function metaKey(meta: DestinationMeta): string {
  return meta.osmId ?? `${meta.label}-${meta.lat}-${meta.lng}`;
}

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
  selectedDestinations,
  plannerProfile,
  onDestinationsChange,
  onPersonalize,
}: DestinationSearchProps) {
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [apiResults, setApiResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 320);

  const ranked = useMemo(
    () => rankDestinationsForProfile(plannerProfile, query),
    [plannerProfile, query]
  );

  const featured = useMemo(() => {
    let list = ranked;
    if (regionFilter) {
      list = list.filter((d) => d.region === regionFilter);
    }
    if (!query.trim()) {
      return list.slice(0, FEATURED_DESTINATION_COUNT);
    }
    return list;
  }, [ranked, regionFilter, query]);

  const showApiSearch = debouncedQuery.trim().length >= 2;

  const fetchPlaces = useCallback(async (q: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results?: PlaceResult[]; error?: string };
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

  const toggleDestination = (dest: ComposerDestination) => {
    const meta = featuredToMeta(dest);
    const key = metaKey(meta);
    const exists = selectedDestinations.some((d) => metaKey(d) === key);
    if (exists) {
      onDestinationsChange(selectedDestinations.filter((d) => metaKey(d) !== key));
    } else {
      onDestinationsChange([...selectedDestinations, meta]);
    }
  };

  const togglePlace = (place: PlaceResult) => {
    const meta = placeToMeta(place);
    const key = metaKey(meta);
    const exists = selectedDestinations.some((d) => metaKey(d) === key);
    if (exists) {
      onDestinationsChange(selectedDestinations.filter((d) => metaKey(d) !== key));
    } else {
      onDestinationsChange([...selectedDestinations, meta]);
    }
    setQuery('');
    setFocused(false);
    setApiResults([]);
    inputRef.current?.blur();
  };

  const isSelected = (dest: ComposerDestination) =>
    selectedDestinations.some((d) => d.label === dest.label);

  const showDropdown =
    focused && (showApiSearch || (query.trim().length > 0 && featured.length > 0));

  return (
    <div className="space-y-5">
      {selectedDestinations.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent/80">
            Mete selezionate
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedDestinations.map((meta) => (
              <span
                key={metaKey(meta)}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-white"
              >
                {meta.label}
                {meta.subtitle ? (
                  <span className="text-white/45 text-xs hidden sm:inline">{meta.subtitle}</span>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    onDestinationsChange(
                      selectedDestinations.filter((d) => metaKey(d) !== metaKey(meta))
                    )
                  }
                  className="text-white/50 hover:text-white"
                  aria-label={`Rimuovi ${meta.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div
          className={`composer-search-glow rounded-2xl transition-all duration-500 ${
            focused ? 'composer-search-glow-active' : ''
          }`}
        >
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 180)}
              placeholder="Cerca qualsiasi luogo — città, paese, isola…"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-12 text-sm text-white outline-none transition focus:border-amber-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/15 placeholder:text-white/35"
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-accent" />
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
              className="absolute z-50 mt-2 max-h-[min(420px,60vh)] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1220]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              {showApiSearch && (
                <div className="p-2">
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Risultati nel mondo
                  </p>
                  {loading && apiResults.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-white/50">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-accent" />
                      Ricerca in corso…
                    </div>
                  )}
                  {apiError && (
                    <p className="px-3 py-4 text-sm text-rose-300/80">{apiError}</p>
                  )}
                  {!loading && !apiError && apiResults.length === 0 && (
                    <p className="px-3 py-4 text-sm text-white/50">
                      Nessun risultato in alfabeto occidentale. Prova un altro nome (es. nome del
                      paese in italiano o inglese).
                    </p>
                  )}
                  {apiResults.map((place) => {
                    const Icon = placeIcon(place.placeType);
                    const already = selectedDestinations.some(
                      (d) => metaKey(d) === metaKey(placeToMeta(place))
                    );
                    return (
                      <button
                        key={place.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => togglePlace(place)}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.06]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] transition-colors group-hover:bg-accent/15">
                          <Icon className="h-4 w-4 text-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-white">{place.label}</p>
                          <p className="truncate text-xs text-white/45">{place.subtitle}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/30">
                          {already ? 'Selezionato' : place.placeTypeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {featured.length > 0 && (
                <div
                  className={`p-2 ${showApiSearch && apiResults.length > 0 ? 'border-t border-white/8' : ''}`}
                >
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    {showApiSearch ? 'Mete in evidenza' : 'Suggerimenti'}
                  </p>
                  {featured.slice(0, showApiSearch ? 4 : 8).map((dest) => (
                    <button
                      key={dest.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        toggleDestination(dest);
                        setQuery('');
                        setFocused(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="text-xl">{dest.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{dest.label}</p>
                        <p className="text-xs text-white/40">{dest.vibe}</p>
                      </div>
                      {isSelected(dest) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!query.trim() && (
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

          <p className="text-xs text-white/45">
            {FEATURED_DESTINATION_COUNT} mete suggerite · digita per cercare qualsiasi luogo nel
            mondo
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((dest, i) => {
              const selected = isSelected(dest);
              return (
                <motion.button
                  key={dest.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  onClick={() => toggleDestination(dest)}
                  className={`composer-dest-card group relative aspect-[4/5] overflow-hidden rounded-2xl text-left ${
                    selected ? 'composer-dest-card-selected' : ''
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${dest.gradient} opacity-80 transition-opacity duration-500 group-hover:opacity-100`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col justify-end p-4">
                    <span className="mb-2 text-3xl drop-shadow-lg">{dest.emoji}</span>
                    <p className="font-display text-lg font-semibold leading-tight text-white">
                      {dest.label}
                    </p>
                    <p className="mt-1 text-[11px] text-white/65">{dest.vibe}</p>
                    {selected && (
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-accent">
                        Selezionata
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {query.trim() && !showDropdown && featured.length === 0 && !loading && !showApiSearch && (
        <p className="py-8 text-center text-sm text-white/50">
          Digita almeno 2 caratteri per cercare nel mondo.
        </p>
      )}

      <button
        type="button"
        onClick={onPersonalize}
        className="mx-auto flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        <Sparkles className="h-4 w-4" />
        Personalizza per esperienza AI
      </button>
    </div>
  );
}
