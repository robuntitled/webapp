'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { CATALOG_CONTINENTS } from '@/lib/catalog/destinations';
import { catalogBudgetBounds } from '@/lib/itineraries/catalog';
import { cn } from '@/lib/utils';

export const DURATION_FILTERS = [7, 10, 14, 21, 28] as const;

export const PRICE_PRESETS = [800, 1000, 1500, 2000, 3000] as const;

export type CatalogFilterState = {
  query: string;
  continent: string;
  duration: number | null;
  /** Budget orientativo max (€ a persona). null = nessun filtro. */
  priceMax: number | null;
  /** Solo griglia partenze standalone con barra legacy. */
  published: boolean | null;
};

export const EMPTY_CATALOG_FILTERS: CatalogFilterState = {
  query: '',
  continent: 'Tutte',
  duration: null,
  priceMax: null,
  published: null,
};

const inlineFilterBtn =
  'inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-primary';

export function CatalogHeroSearchBar({
  value,
  onChange,
  placeholder = 'Cerca destinazione',
  resultsId,
  durationOptions,
  priceBounds = catalogBudgetBounds(),
}: {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  placeholder?: string;
  resultsId?: string;
  durationOptions?: number[];
  priceBounds?: { min: number; max: number };
}) {
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

  const durationLabel =
    value.duration != null ? `${value.duration} giorni` : 'Durata';
  const priceLabel =
    value.priceMax != null
      ? `≤ ${value.priceMax.toLocaleString('it-IT')} €`
      : 'Prezzo';

  return (
    <div className="flex h-12 w-full items-center gap-1 rounded-full border border-slate-200 bg-white pl-3.5 pr-1.5 shadow-md">
      <Search className="pointer-events-none h-4 w-4 shrink-0 text-slate-400" />
      <input
        type="search"
        value={value.query}
        onChange={(e) => set('query', e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-2 pr-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        autoComplete="off"
        aria-controls={resultsId}
      />
      <div className="flex shrink-0 items-center overflow-x-auto">
        <span className="mx-0.5 h-6 w-px bg-slate-200" aria-hidden />
        <Popover>
          <PopoverTrigger type="button" className={cn(inlineFilterBtn, value.duration != null && 'text-primary')}>
            {durationLabel}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 rounded-2xl p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Durata
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={value.duration === null}
                onClick={() => set('duration', null)}
                label="Tutti"
              />
              {days.map((n) => (
                <FilterChip
                  key={n}
                  active={value.duration === n}
                  onClick={() => set('duration', value.duration === n ? null : n)}
                  label={`${n}g`}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <span className="mx-0.5 h-6 w-px bg-slate-200" aria-hidden />
        <Popover>
          <PopoverTrigger type="button" className={cn(inlineFilterBtn, value.priceMax != null && 'text-primary')}>
            {priceLabel}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-2xl p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Budget orientativo max
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <FilterChip
                active={value.priceMax === null}
                onClick={() => set('priceMax', null)}
                label="Qualsiasi"
              />
              {PRICE_PRESETS.filter((p) => p >= priceBounds.min).map((p) => (
                <FilterChip
                  key={p}
                  active={value.priceMax === p}
                  onClick={() => set('priceMax', value.priceMax === p ? null : p)}
                  label={`≤ ${p.toLocaleString('it-IT')} €`}
                />
              ))}
            </div>
            <Slider
              min={priceBounds.min}
              max={Math.max(priceBounds.max, 3000)}
              step={50}
              value={[value.priceMax ?? priceBounds.max]}
              onValueChange={(v) => set('priceMax', v[0] === priceBounds.max ? null : v[0])}
            />
            <p className="mt-2 text-sm tabular-nums text-slate-700">
              {value.priceMax != null
                ? `Fino a ${value.priceMax.toLocaleString('it-IT')} € a persona`
                : 'Nessun limite di prezzo'}
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function CatalogSearchField({
  value,
  onChange,
  placeholder = 'Cerca destinazione',
  resultsId,
}: {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  resultsId?: string;
}) {
  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-md outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        autoComplete="off"
        aria-controls={resultsId}
      />
    </div>
  );
}

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

  if (showSearch && !showContinents && !showPublished) {
    return (
      <CatalogHeroSearchBar
        value={value}
        onChange={onChange}
        placeholder={searchPlaceholder}
        resultsId={resultsId}
        durationOptions={durationOptions}
      />
    );
  }

  return (
    <div className="w-full space-y-3">
      {showSearch ? (
        <CatalogHeroSearchBar
          value={value}
          onChange={onChange}
          placeholder={searchPlaceholder}
          resultsId={resultsId}
          durationOptions={durationOptions}
        />
      ) : null}

      <div className="flex w-full flex-wrap items-center gap-1.5">
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
