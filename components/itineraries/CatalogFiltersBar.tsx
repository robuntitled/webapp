'use client';

import { useMemo, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
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
};

export const EMPTY_CATALOG_FILTERS: CatalogFilterState = {
  query: '',
  continent: 'Tutte',
  duration: null,
  priceMax: null,
};

const inlineFilterBtn =
  'inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full px-2 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-primary sm:h-9 sm:gap-1 sm:px-3 sm:text-[0.9375rem]';

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
  const reducedMotion = usePrefersReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CatalogFilterState>(key: K, v: CatalogFilterState[K]) =>
    onChange({ ...value, [key]: v });

  const runSearch = () => {
    inputRef.current?.focus();
    if (!resultsId) return;
    document.getElementById(resultsId)?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const days = useMemo(() => {
    const base = durationOptions?.length
      ? [...new Set(durationOptions)].sort((a, b) => a - b)
      : [...DURATION_FILTERS];
    if (value.duration != null && !base.includes(value.duration)) {
      return [...base, value.duration].sort((a, b) => a - b);
    }
    return base;
  }, [durationOptions, value.duration]);

  const durationLabel = value.duration != null ? `${value.duration}g` : 'Durata';
  const priceLabel =
    value.priceMax != null
      ? `≤${value.priceMax >= 1000 ? `${Math.round(value.priceMax / 1000)}k` : value.priceMax}€`
      : 'Prezzo';

  return (
    <form
      role="search"
      className="flex min-h-[4.35rem] w-full min-w-0 items-center gap-1 rounded-full border border-slate-200/90 bg-white py-1.5 pl-1.5 pr-1.5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.35)] sm:min-h-[4.75rem] sm:gap-1.5 sm:pl-2 sm:pr-2"
      onSubmit={(e) => {
        e.preventDefault();
        runSearch();
      }}
    >
      <button
        type="submit"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-12 sm:w-12"
        aria-label="Cerca"
      >
        <Search className="h-5 w-5" strokeWidth={2.25} />
      </button>
      <input
        ref={inputRef}
        type="search"
        value={value.query}
        onChange={(e) => set('query', e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-1 text-[clamp(0.95rem,0.4vw+0.88rem,1.05rem)] text-slate-900 outline-none placeholder:text-slate-400"
        autoComplete="off"
        aria-controls={resultsId}
        aria-label={placeholder}
      />
      <div className="flex shrink-0 items-center">
        <Popover>
          <PopoverTrigger
            type="button"
            className={cn(inlineFilterBtn, value.duration != null && 'text-primary')}
          >
            {durationLabel}
            <ChevronDown className="h-3 w-3 opacity-60 sm:h-3.5 sm:w-3.5" />
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
          <PopoverTrigger
            type="button"
            className={cn(inlineFilterBtn, value.priceMax != null && 'text-primary')}
          >
            {priceLabel}
            <ChevronDown className="h-3 w-3 opacity-60 sm:h-3.5 sm:w-3.5" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-4">
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
        <button
          type="submit"
          className="ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 sm:h-12 sm:w-12"
          aria-label="Avvia ricerca"
        >
          <Search className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>
    </form>
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
    <div className="flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:overflow-visible [&::-webkit-scrollbar]:hidden">
      {['Tutte', ...CATALOG_CONTINENTS].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(value === r && r !== 'Tutte' ? 'Tutte' : r)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition sm:min-w-0 sm:flex-1 sm:px-3',
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
