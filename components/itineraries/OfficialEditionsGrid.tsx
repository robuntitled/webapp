'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CatalogFiltersBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { cn } from '@/lib/utils';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

function durationFromId(templateId: string, fallback?: number | null) {
  if (fallback != null) return fallback;
  const m = templateId.match(/-(\d+)d(?:-|$)/i);
  return m ? Number(m[1]) : null;
}

function scarcityLabel(confirmed: number): 'disponibile' | 'ultimi' {
  return confirmed >= 1 ? 'ultimi' : 'disponibile';
}

export function OfficialEditionsGrid({
  editions,
  filters: controlledFilters,
  onFiltersChange,
  showFiltersBar = true,
}: {
  editions: OfficialEditionCard[];
  filters?: CatalogFilterState;
  onFiltersChange?: (next: CatalogFilterState) => void;
  showFiltersBar?: boolean;
}) {
  const [internalFilters, setInternalFilters] =
    useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);
  const filters = controlledFilters ?? internalFilters;
  const setFilters = onFiltersChange ?? setInternalFilters;

  const enriched = useMemo(
    () =>
      editions.map((ed, i) => {
        const tpl = findItineraryTemplate(ed.template_id);
        const slug = tpl?.destination_slug ?? ed.template_id.split('-')[0] ?? '';
        const dest = findCatalogDestination(slug) ?? findCatalogDestination(ed.template_id);
        const days = durationFromId(ed.template_id, tpl?.duration_days);
        const scarcity = scarcityLabel(ed.confirmed_count ?? 0);
        return {
          ed,
          tpl,
          dest,
          days,
          scarcity,
          cover: uniqueCover(slug || ed.template_id, i),
          name: (tpl?.destination_name ?? (slug || ed.template_id)).toLowerCase(),
          continent: dest?.continent ?? 'Asia',
        };
      }),
    [editions]
  );

  const durationOptions = useMemo(
    () =>
      [...new Set(enriched.map((e) => e.days).filter((d): d is number => d != null))].sort(
        (a, b) => a - b
      ),
    [enriched]
  );

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return enriched.filter(({ ed, tpl, dest, name, continent, days, scarcity }) => {
      if (filters.continent !== 'Tutte' && continent !== filters.continent) return false;
      if (filters.duration != null && (days == null || days !== filters.duration)) return false;
      if (filters.published === true && scarcity !== 'disponibile') return false;
      if (filters.published === false && scarcity !== 'ultimi') return false;
      if (!q) return true;
      return (
        name.includes(q) ||
        ed.template_id.toLowerCase().includes(q) ||
        (tpl?.destination_name ?? '').toLowerCase().includes(q) ||
        (tpl?.summary ?? '').toLowerCase().includes(q) ||
        continent.toLowerCase().includes(q) ||
        (dest?.vibe ?? '').toLowerCase().includes(q) ||
        formatItDate(ed.date_from).toLowerCase().includes(q)
      );
    });
  }, [enriched, filters]);

  return (
    <div className="space-y-5">
      {showFiltersBar ? (
        <CatalogFiltersBar
          value={filters}
          onChange={setFilters}
          searchPlaceholder="Cerca destinazione o date"
          showPublished
          resultsId="risultati-partenze"
          durationOptions={durationOptions}
          publishedLabels={{ all: 'Tutte', yes: 'Disponibile', no: 'Ultimi posti' }}
        />
      ) : null}
      <p className="text-center text-sm font-medium text-slate-600">
        {visible.length}{' '}
        {visible.length === 1 ? 'partenza' : 'partite'}
        {filters.duration != null ? ` · ${filters.duration} giorni` : ''}
        {filters.continent !== 'Tutte' ? ` · ${filters.continent}` : ''}
      </p>
      <ul id="risultati-partenze" className="grid gap-4 sm:grid-cols-2">
        {visible.length === 0 ? (
          <li className="col-span-full rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
            Nessuna partenza con questi filtri. Azzera continente o apri Giorni → Tutti.
          </li>
        ) : (
          visible.map(({ ed, tpl, cover, days, scarcity }) => (
            <li
              key={ed.id}
              className={cn(
                'relative flex gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm',
                'transition hover:border-primary/30 hover:shadow-md'
              )}
            >
              <span
                className={cn(
                  'absolute right-3 top-3 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm',
                  scarcity === 'ultimi' ? 'bg-accent' : 'bg-primary'
                )}
              >
                {scarcity === 'ultimi' ? 'Ultimi posti' : 'Disponibile'}
              </span>
              <div className="relative h-[4.75rem] w-[5.5rem] shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-28">
                <Image src={cover} alt="" fill className="object-cover" sizes="112px" />
                {days != null ? (
                  <p className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {days}g
                  </p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5 pr-14">
                <p className="font-display text-lg font-semibold leading-tight text-slate-900">
                  {tpl?.destination_name ?? ed.template_id}
                </p>
                <p className="text-sm font-medium text-slate-600">
                  {formatItDate(ed.date_from)} – {formatItDate(ed.date_to)}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500">
                    {ed.confirmed_count}/{ed.min_confirmed} confermati
                  </p>
                  <Button asChild size="sm" className="rounded-full bg-accent text-white hover:bg-accent/90">
                    <Link href={`/partenze/${ed.id}`}>Partecipa</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
