'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { DESTINATION_REGIONS, featuredToMeta } from '@/lib/composer/destinations';
import { rankDestinationsForProfile } from '@/lib/composer/destination-suggestions';
import type { ComposerDestination, DestinationMeta } from '@/types/composer';
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

export function DestinationSearch({
  selectedDestinations,
  plannerProfile,
  onDestinationsChange,
  onPersonalize,
}: DestinationSearchProps) {
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const ranked = useMemo(
    () => rankDestinationsForProfile(plannerProfile),
    [plannerProfile]
  );

  const featured = useMemo(() => {
    if (!regionFilter) return ranked;
    return ranked.filter((d) => d.region === regionFilter);
  }, [ranked, regionFilter]);

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
          const selected = isSelected(dest);
          return (
            <motion.button
              key={dest.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => toggleDestination(dest)}
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