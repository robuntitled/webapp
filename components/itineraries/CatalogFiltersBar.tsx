'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { CATALOG_CONTINENTS } from '@/lib/catalog/destinations';
import { cn } from '@/lib/utils';

export const DURATION_FILTERS = [7, 10, 14, 21, 28] as const;

export type CatalogFilterState = {
  query: string;
  continent: string;
  duration: number | null;
  /** null = tutte, true = prenotabili ora, false = in arrivo */
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
  searchPlaceholder = 'Cerca destinazione',
  showPublished = true,
  showContinents = true,
  showSearch = true,
  resultsId = 'risultati-catalogo',
  durationOptions,
  publishedLabels = { all: 'Tutte', yes: 'Prenotabili', no: 'In arrivo' },
}: {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  searchPlaceholder?: string;
  showPublished?: boolean;
  /** Chip continente (Tutte / Europa / …). */
  showContinents?: boolean;
  showSearch?: boolean;
  resultsId?: string;
  durationOptions?: number[];
  publishedLabels?: { all: string; yes: string; no: string };
}) {
  const [daysOpen, setDaysOpen] = useState(Boolean(value.duration));
  const set = <K extends keyof CatalogFilterState>(key: K, v: CatalogFilterState[K]) =>
    onChange({ ...value, [key]: v });

  const days = useMemo(() => {
    const base = durationOptions?.length
      ? [...new Set(durationOptions)].sort((a, b) => a - b)
      : [...DURATION_FILTERS];
    if (value.duration != null && !base.includes(value.duration)) {
      return [...base, value.duration].sort((a, b) => a - b);
    }
    return base;
  }, [durationOptions, value.duration]);

  return (
    <div className="w-full space-y-3">
      {showSearch ? (
        <CatalogSearchField
          value={value.query}
          onChange={(query) => set('query', query)}
          placeholder={searchPlaceholder}
          resultsId={resultsId}
        />
      ) : null}

      <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
        {showContinents
          ? ['Tutte', ...CATALOG_CONTINENTS].map((r) => (
              <FilterChip
                key={r}
                active={value.continent === r}
                onClick={() =>
                  set('continent', value.continent === r && r !== 'Tutte' ? 'Tutte' : r)
                }
                label={r}
              />
            ))
          : null}

        {showContinents ? (
          <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" aria-hidden />
        ) : null}

        <button
          type="button"
          onClick={() => setDaysOpen((o) => !o)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition',
            value.duration != null || daysOpen
              ? 'border-primary bg-primary text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary'
          )}
          aria-expanded={daysOpen}
        >
          {value.duration != null ? `${value.duration}g` : 'Giorni'}
          <ChevronDown className={cn('h-3.5 w-3.5 transition', daysOpen && 'rotate-180')} />
        </button>

        {daysOpen
          ? [
              <FilterChip
                key="days-all"
                active={value.duration === null}
                onClick={() => set('duration', null)}
                label="Tutti"
              />,
              ...days.map((n) => (
                <FilterChip
                  key={n}
                  active={value.duration === n}
                  onClick={() => {
                    set('duration', value.duration === n ? null : n);
                    setDaysOpen(true);
                  }}
                  label={`${n}g`}
                />
              )),
            ]
          : null}

        {showPublished ? (
          <>
            <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" aria-hidden />
            <FilterChip
              active={value.published === null}
              onClick={() => set('published', null)}
              label={publishedLabels.all}
            />
            <FilterChip
              active={value.published === true}
              onClick={() => set('published', value.published === true ? null : true)}
              label={publishedLabels.yes}
            />
            <FilterChip
              active={value.published === false}
              onClick={() => set('published', value.published === false ? null : false)}
              label={publishedLabels.no}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Campo cerca a piena larghezza (allineato a navbar / griglia). */
export function CatalogSearchField({
  value,
  onChange,
  placeholder,
  resultsId,
}: {
  value: string;
  onChange: (query: string) => void;
  placeholder: string;
  resultsId?: string;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-[0_10px_28px_-12px_rgba(15,23,42,0.45)] outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        autoComplete="off"
        aria-controls={resultsId}
      />
    </div>
  );
}

/** Chip continente su fondo bianco (sotto l’hero). */
export function ContinentFilterRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (continent: string) => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2">
      {['Tutte', ...CATALOG_CONTINENTS].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(value === r && r !== 'Tutte' ? 'Tutte' : r)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition',
            value === r
              ? 'bg-primary text-white'
              : 'border border-slate-300 bg-white text-slate-800 hover:border-primary hover:text-primary'
          )}
        >
          {r}
        </button>
      ))}
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
        'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-primary text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary'
      )}
    >
      {label}
    </button>
  );
}
