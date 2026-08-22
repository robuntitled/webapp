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

/** Elenco partenze chiaro, filtri affidabili. */
export function OfficialEditionsGrid({ editions }: { editions: OfficialEditionCard[] }) {
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);

  const enriched = useMemo(
    () =>
      editions.map((ed, i) => {
        const tpl = findItineraryTemplate(ed.template_id);
        const slug = tpl?.destination_slug ?? ed.template_id.split('-')[0] ?? '';
        const dest = findCatalogDestination(slug) ?? findCatalogDestination(ed.template_id);
        const days = durationFromId(ed.template_id, tpl?.duration_days);
        // Tutte le partenze in elenco sono joinabili (anche seed di lancio).
        const open = ed.status === 'open' || ed.status === 'formed' || ed.id.startsWith('seed-');
        return {
          ed,
          tpl,
          dest,
          days,
          open,
          cover: uniqueCover(slug || ed.template_id, i),
          name: (tpl?.destination_name ?? slug || ed.template_id).toLowerCase(),
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
    return enriched.filter(({ ed, tpl, dest, name, continent, days, open }) => {
      if (filters.continent !== 'Tutte' && continent !== filters.continent) return false;
      if (filters.duration != null && (days == null || days !== filters.duration)) return false;
      if (filters.published === true && !open) return false;
      if (filters.published === false && open) return false;
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
      <CatalogFiltersBar
        value={filters}
        onChange={setFilters}
        searchPlaceholder="Cerca destinazione o date"
        showPublished
        resultsId="risultati-partenze"
        durationOptions={durationOptions}
        publishedLabels={{ all: 'Tutte', yes: 'Aperte', no: 'Presto' }}
      />
      <p className="text-center text-sm font-medium text-slate-600">
        {visible.length}{' '}
        {visible.length === 1 ? 'partenza' : 'partite'}
        {filters.duration != null ? ` · ${filters.duration} giorni` : ''}
        {filters.continent !== 'Tutte' ? ` · ${filters.continent}` : ''}
      </p>
      <ul id="risultati-partenze" className="space-y-3">
        {visible.length === 0 ? (
          <li className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
            Nessuna partenza con questi filtri. Azzera continente o apri Giorni → Tutti.
          </li>
        ) : (
          visible.map(({ ed, tpl, cover, days }) => (
            <li
              key={ed.id}
              className={cn(
                'flex gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm',
                'transition hover:border-primary/30 hover:shadow-md'
              )}
            >
              <div className="relative h-[4.75rem] w-[6.5rem] shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-36">
                <Image src={cover} alt="" fill className="object-cover" sizes="144px" />
                {days != null ? (
                  <p className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {days}g
                  </p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
                <p className="font-display text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
                  {tpl?.destination_name ?? ed.template_id}
                </p>
                <p className="text-sm font-medium text-slate-600">
                  {formatItDate(ed.date_from)} – {formatItDate(ed.date_to)}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500">
                    {ed.confirmed_count}/{ed.min_confirmed} confermati
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      Aperta
                    </span>
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
