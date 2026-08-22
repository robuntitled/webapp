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
  resultsId = 'risultati-catalogo',
  durationOptions,
  publishedLabels = { all: 'Tutte', yes: 'Prenotabili', no: 'In arrivo' },
}: {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  searchPlaceholder?: string;
  showPublished?: boolean;
  resultsId?: string;
  /** Giorni disponibili nei risultati (se assenti usa default). */
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
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value.query}
          onChange={(e) => set('query', e.target.value)}
          placeholder={searchPlaceholder}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
          aria-controls={resultsId}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Continente
        </p>
        <div className="flex flex-wrap gap-1.5">
          {['Tutte', ...CATALOG_CONTINENTS].map((r) => (
            <FilterChip
              key={r}
              active={value.continent === r}
              onClick={() =>
                set('continent', value.continent === r && r !== 'Tutte' ? 'Tutte' : r)
              }
              label={r}
            />
          ))}
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setDaysOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition',
              value.duration != null || daysOpen
                ? 'border-primary bg-primary text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary'
            )}
            aria-expanded={daysOpen}
          >
            {value.duration != null ? `${value.duration} giorni` : 'Giorni'}
            <ChevronDown
              className={cn('h-4 w-4 transition', daysOpen && 'rotate-180')}
            />
          </button>
          {daysOpen ? (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5">
              <FilterChip
                active={value.duration === null}
                onClick={() => set('duration', null)}
                label="Tutti"
              />
              {days.map((n) => (
                <FilterChip
                  key={n}
                  active={value.duration === n}
                  onClick={() => {
                    set('duration', value.duration === n ? null : n);
                    setDaysOpen(true);
                  }}
                  label={`${n}g`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {showPublished ? (
          <div className="mt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Disponibilità
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={value.published === null}
                onClick={() => set('published', null)}
                label={publishedLabels.all}
              />
              <FilterChip
                active={value.published === true}
                onClick={() =>
                  set('published', value.published === true ? null : true)
                }
                label={publishedLabels.yes}
              />
              <FilterChip
                active={value.published === false}
                onClick={() =>
                  set('published', value.published === false ? null : false)
                }
                label={publishedLabels.no}
              />
            </div>
          </div>
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
          ? 'bg-primary text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary'
      )}
    >
      {label}
    </button>
  );
}
