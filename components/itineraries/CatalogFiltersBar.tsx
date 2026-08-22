'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
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

type Panel = 'dove' | 'quando' | 'extra' | null;

export function CatalogFiltersBar({
  value,
  onChange,
  searchPlaceholder = 'Cerca nazione, continente o vibe',
  showPublished = true,
  resultsId = 'risultati-catalogo',
  durationOptions,
  publishedLabels = { all: 'Tutte', yes: 'Prenotabili', no: 'In arrivo' },
  doveEmptyLabel = 'Ovunque',
  quandoEmptyLabel = "Tutto l'anno",
}: {
  value: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  searchPlaceholder?: string;
  showPublished?: boolean;
  resultsId?: string;
  durationOptions?: number[];
  publishedLabels?: { all: string; yes: string; no: string };
  doveEmptyLabel?: string;
  quandoEmptyLabel?: string;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const doveValue =
    value.query.trim() ||
    (value.continent === 'Tutte' ? doveEmptyLabel : value.continent);
  const quandoValue =
    value.duration != null ? `${value.duration} giorni` : quandoEmptyLabel;
  const extraValue =
    value.published === true
      ? publishedLabels.yes
      : value.published === false
        ? publishedLabels.no
        : publishedLabels.all;

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const submitSearch = () => {
    setPanel(null);
    document.getElementById(resultsId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className={cn(
          'flex w-full items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white',
          'shadow-[0_8px_30px_-12px_rgba(15,23,42,0.28)]'
        )}
      >
        <FieldButton
          label="Dove?"
          value={doveValue}
          open={panel === 'dove'}
          onClick={() => toggle('dove')}
          className="min-w-0 flex-[1.35]"
        />
        <span className="my-3 w-px shrink-0 bg-slate-200" aria-hidden />
        <FieldButton
          label="Quando?"
          value={quandoValue}
          open={panel === 'quando'}
          onClick={() => toggle('quando')}
          className="min-w-0 flex-1"
        />
        {showPublished ? (
          <>
            <span className="my-3 hidden w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
            <FieldButton
              label="Disponibilità"
              value={extraValue}
              open={panel === 'extra'}
              onClick={() => toggle('extra')}
              className="hidden min-w-0 flex-1 sm:flex"
            />
            <button
              type="button"
              onClick={() => toggle('extra')}
              className={cn(
                'flex items-center justify-center px-3 text-slate-600 sm:hidden',
                panel === 'extra' && 'bg-slate-50 text-primary'
              )}
              aria-label="Altri filtri"
              aria-expanded={panel === 'extra'}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={submitSearch}
          className="m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent/90 sm:h-12 sm:w-12"
          aria-label="Cerca"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      {panel === 'dove' ? (
        <PanelCard>
          <input
            type="search"
            value={value.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            autoFocus
            aria-controls={resultsId}
          />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Continente
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['Tutte', ...CATALOG_CONTINENTS].map((r) => (
              <Chip
                key={r}
                active={value.continent === r}
                label={r === 'Tutte' ? doveEmptyLabel : r}
                onClick={() => {
                  set('continent', r);
                  setPanel(null);
                }}
              />
            ))}
          </div>
        </PanelCard>
      ) : null}

      {panel === 'quando' ? (
        <PanelCard>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Durata
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip
              active={value.duration === null}
              label={quandoEmptyLabel}
              onClick={() => {
                set('duration', null);
                setPanel(null);
              }}
            />
            {days.map((n) => (
              <Chip
                key={n}
                active={value.duration === n}
                label={`${n} giorni`}
                onClick={() => {
                  set('duration', value.duration === n ? null : n);
                  setPanel(null);
                }}
              />
            ))}
          </div>
        </PanelCard>
      ) : null}

      {panel === 'extra' && showPublished ? (
        <PanelCard>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Disponibilità
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip
              active={value.published === null}
              label={publishedLabels.all}
              onClick={() => {
                set('published', null);
                setPanel(null);
              }}
            />
            <Chip
              active={value.published === true}
              label={publishedLabels.yes}
              onClick={() => {
                set('published', value.published === true ? null : true);
                setPanel(null);
              }}
            />
            <Chip
              active={value.published === false}
              label={publishedLabels.no}
              onClick={() => {
                set('published', value.published === false ? null : false);
                setPanel(null);
              }}
            />
          </div>
        </PanelCard>
      ) : null}
    </div>
  );
}

function FieldButton({
  label,
  value,
  open,
  onClick,
  className,
}: {
  label: string;
  value: string;
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        'flex flex-col items-start justify-center gap-0.5 px-4 py-2.5 text-left transition hover:bg-slate-50 sm:px-5',
        open && 'bg-slate-50',
        className
      )}
    >
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <span className="flex w-full items-center gap-1 truncate text-sm font-semibold text-slate-900 sm:text-base">
        <span className="truncate">{value}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition', open && 'rotate-180')}
        />
      </span>
    </button>
  );
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)]">
      {children}
    </div>
  );
}

function Chip({
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
