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
    <div className="space-y-2">
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

      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {['Tutte', ...CATALOG_CONTINENTS].map((r) => (
          <FilterChip
            key={r}
            active={value.continent === r}
            onClick={() => set('continent', r)}
            label={r === 'Tutte' ? 'Tutte' : r}
          />
        ))}
        <span className="mx-0.5 h-4 w-px shrink-0 bg-white/20" aria-hidden />
        {DURATION_FILTERS.map((n) => (
          <FilterChip
            key={n}
            active={value.duration === n}
            onClick={() => set('duration', value.duration === n ? null : n)}
            label={`${n}g`}
          />
        ))}
        {showPublished ? (
          <>
            <span className="mx-0.5 h-4 w-px shrink-0 bg-white/20" aria-hidden />
            <FilterChip
              active={value.published === true}
              onClick={() => set('published', value.published === true ? null : true)}
              label="Aperte"
            />
            <FilterChip
              active={value.published === false}
              onClick={() => set('published', value.published === false ? null : false)}
              label="Presto"
            />
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
        'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition sm:text-sm',
        active
          ? 'bg-accent text-[#0b1220]'
          : 'border border-white/15 bg-[#161d2b]/80 text-white/80 hover:bg-[#1c2436]'
      )}
    >
      {label}
    </button>
  );
}
