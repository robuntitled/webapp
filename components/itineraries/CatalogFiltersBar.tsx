'use client';

import { Search } from 'lucide-react';
import { CATALOG_CONTINENTS } from '@/lib/catalog/destinations';
import { cn } from '@/lib/utils';

export const DURATION_FILTERS = [7, 10, 14, 21, 28] as const;

export type CatalogFilterState = {
  query: string;
  continent: string;
  duration: number | null;
  /** null = tutte, true = già prenotabili, false = in arrivo */
  published: boolean | null;
};

export const EMPTY_CATALOG_FILTERS: CatalogFilterState = {
  query: '',
  continent: 'Tutte',
  duration: null,
  published: null,
};

export function CatalogFiltersBar({
  value,
  onChange,
  searchPlaceholder = 'Cerca nazione o continente',
  showPublished = true,
  resultsId = 'risultati-catalogo',
}: {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  searchPlaceholder?: string;
  showPublished?: boolean;
  resultsId?: string;
}) {
  const set = <K extends keyof CatalogFilterState>(key: K, v: CatalogFilterState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={value.query}
          onChange={(e) => set('query', e.target.value)}
          placeholder={searchPlaceholder}
          className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
          aria-controls={resultsId}
        />
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0b1220]/55 p-3">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Continente
        </p>
        <div className="flex flex-wrap gap-1.5">
          {['Tutte', ...CATALOG_CONTINENTS].map((r) => (
            <FilterChip
              key={r}
              active={value.continent === r}
              onClick={() => set('continent', r)}
              label={r}
            />
          ))}
        </div>

        <p className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Giorni
        </p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={value.duration === null}
            onClick={() => set('duration', null)}
            label="Tutte"
          />
          {DURATION_FILTERS.map((n) => (
            <FilterChip
              key={n}
              active={value.duration === n}
              onClick={() => set('duration', n)}
              label={`${n}g`}
            />
          ))}
        </div>

        {showPublished ? (
          <>
            <p className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Disponibilità
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={value.published === null}
                onClick={() => set('published', null)}
                label="Tutte"
              />
              <FilterChip
                active={value.published === true}
                onClick={() => set('published', true)}
                label="Aperte ora"
              />
              <FilterChip
                active={value.published === false}
                onClick={() => set('published', false)}
                label="In arrivo"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-accent text-[#0b1220]'
          : 'border border-white/15 bg-[#161d2b]/80 text-white/80 hover:bg-[#1c2436]'
      )}
    >
      {label}
    </button>
  );
}
