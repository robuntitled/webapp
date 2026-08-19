'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Globe2, Search, Sparkles, X } from 'lucide-react';
import {
  DESTINATION_REGIONS,
  featuredToMeta,
} from '@/lib/composer/destinations';
import { countriesInRegion } from '@/lib/composer/continent-countries';
import { coverForDestination } from '@/lib/composer/destination-covers';
import {
  FEATURED_DESTINATION_COUNT,
  rankDestinationsForProfile,
} from '@/lib/composer/destination-suggestions';
import { searchMajorPlaces, type MajorPlaceHit } from '@/lib/composer/major-places';
import type { ComposerDestination, DestinationMeta } from '@/types/composer';
import type { PlaceResult } from '@/lib/places/types';
import type { PlannerProfile } from '@/types/planner';

/** Tipi luogo ammessi dal fallback live: nazioni + grandi centri, no vie/POI. */
const GEOCODE_PLACE_TYPES = new Set([
  'country',
  'city',
  'town',
  'municipality',
  'administrative',
  'island',
  'archipelago',
  'state',
  'region',
  'county',
]);

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

type DestinationSearchProps = {
  selectedDestinations: DestinationMeta[];
  plannerProfile?: PlannerProfile | null;
  onDestinationsChange: (destinations: DestinationMeta[]) => void;
  onPersonalize: () => void;
};

function metaKey(meta: DestinationMeta): string {
  return meta.osmId ?? `${meta.label}-${meta.lat}-${meta.lng}`;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const ranked = useMemo(
    () => rankDestinationsForProfile(plannerProfile),
    [plannerProfile]
  );

  const gridItems = useMemo(() => {
    if (regionFilter) return countriesInRegion(regionFilter);
    return ranked.slice(0, FEATURED_DESTINATION_COUNT);
  }, [ranked, regionFilter]);

  const searchHits = useMemo(
    () => (query.trim().length >= 2 ? searchMajorPlaces(query.trim()) : []),
    [query]
  );

  const [remoteHits, setRemoteHits] = useState<MajorPlaceHit[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  // Fallback live: copre qualsiasi città reale (es. Firenze) non in lista curata.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setRemoteHits([]);
      setRemoteLoading(false);
      return;
    }
    let cancelled = false;
    setRemoteLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, {
          credentials: 'same-origin',
        });
        const data = (await res.json()) as { results?: PlaceResult[] };
        if (cancelled) return;
        const hits: MajorPlaceHit[] = (data.results ?? [])
          .filter((r) => GEOCODE_PLACE_TYPES.has(r.placeType))
          .map((r) => ({
            kind: r.placeType === 'country' ? ('country' as const) : ('city' as const),
            label: r.label,
            lat: r.lat,
            lng: r.lng,
            country: r.country,
            countryCode: r.countryCode,
            subtitle: r.subtitle || r.country || '',
            placeType: r.placeType,
            placeTypeLabel: r.placeTypeLabel,
          }));
        setRemoteHits(hits);
      } catch {
        if (!cancelled) setRemoteHits([]);
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const mergedHits = useMemo(() => {
    const seen = new Set(searchHits.map((h) => normalizeLabel(h.label)));
    const extra = remoteHits.filter((h) => !seen.has(normalizeLabel(h.label)));
    return [...searchHits, ...extra].slice(0, 10);
  }, [searchHits, remoteHits]);

  const showDropdown = focused && query.trim().length >= 2;

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

  const togglePlace = (place: MajorPlaceHit) => {
    const meta: DestinationMeta = {
      label: place.label,
      lat: place.lat,
      lng: place.lng,
      country: place.country,
      placeType: place.placeType,
      placeTypeLabel: place.placeTypeLabel,
      subtitle: place.subtitle,
    };
    const key = metaKey(meta);
    const exists = selectedDestinations.some((d) => metaKey(d) === key);
    if (exists) {
      onDestinationsChange(selectedDestinations.filter((d) => metaKey(d) !== key));
    } else {
      onDestinationsChange([...selectedDestinations, meta]);
    }
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  };

  const isSelected = (dest: ComposerDestination) =>
    selectedDestinations.some((d) => d.label === dest.label);

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
                  <span className="hidden text-xs text-white/45 sm:inline">{meta.subtitle}</span>
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
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 180)}
              placeholder="Cerca nazioni o grandi città"
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="off"
            />
          </div>
        </div>

        <AnimatePresence>
          {showDropdown ? (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 mt-2 max-h-[min(420px,60vh)] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1220]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <div className="p-2">
                {mergedHits.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-white/70">
                    {remoteLoading ? 'Cerco…' : 'Nessun risultato trovato'}
                  </p>
                ) : (
                  mergedHits.map((place) => {
                    const Icon = place.kind === 'country' ? Globe2 : Building2;
                    const already = selectedDestinations.some((d) => d.label === place.label);
                    return (
                      <button
                        key={`${place.kind}-${place.label}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => togglePlace(place)}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.06]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] group-hover:bg-accent/15">
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
                  })
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!query.trim() ? (
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
            {regionFilter
              ? `Tutti i paesi · ${regionFilter}`
              : `${FEATURED_DESTINATION_COUNT} mete in evidenza · scegli un continente per tutti i paesi`}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gridItems.map((dest, i) => {
              const selected = isSelected(dest);
              const cover = coverForDestination(dest.id);
              return (
                <motion.button
                  key={dest.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 24) * 0.02, duration: 0.3 }}
                  onClick={() => toggleDestination(dest)}
                  className={`composer-dest-card group relative aspect-[4/5] overflow-hidden rounded-2xl text-left ${
                    selected ? 'composer-dest-card-selected' : ''
                  }`}
                >
                  <Image
                    src={cover}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="relative z-10 flex h-full flex-col justify-end p-4">
                    <span className="mb-2 text-3xl drop-shadow-lg">{dest.emoji}</span>
                    <p className="font-display text-lg font-semibold leading-tight text-white">
                      {dest.label}
                    </p>
                    <p className="mt-1 text-[11px] text-white/65">{dest.vibe}</p>
                    {selected ? (
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-accent">
                        Selezionata
                      </span>
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      ) : null}

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
