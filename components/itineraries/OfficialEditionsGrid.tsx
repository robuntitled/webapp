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

/** Elenco partenze con ricerca + filtri che puntano ai risultati. */
export function OfficialEditionsGrid({ editions }: { editions: OfficialEditionCard[] }) {
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);

  const enriched = useMemo(
    () =>
      editions.map((ed, i) => {
        const tpl = findItineraryTemplate(ed.template_id);
        const dest = tpl ? findCatalogDestination(tpl.destination_slug) : undefined;
        return {
          ed,
          tpl,
          dest,
          cover: uniqueCover(tpl?.destination_slug ?? ed.template_id, i),
          name: (tpl?.destination_name ?? ed.template_id).toLowerCase(),
        };
      }),
    [editions]
  );

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return enriched.filter(({ ed, tpl, dest, name }) => {
      if (filters.continent !== 'Tutte' && dest?.continent !== filters.continent) return false;
      if (filters.duration != null && tpl?.duration_days !== filters.duration) return false;
      if (filters.published === true && ed.id.startsWith('seed-')) return false;
      if (filters.published === false && !ed.id.startsWith('seed-')) return false;
      if (!q) return true;
      return (
        name.includes(q) ||
        ed.template_id.toLowerCase().includes(q) ||
        (tpl?.summary ?? '').toLowerCase().includes(q) ||
        (dest?.continent ?? '').toLowerCase().includes(q)
      );
    });
  }, [enriched, filters]);

  return (
    <div className="space-y-5">
      <CatalogFiltersBar
        value={filters}
        onChange={setFilters}
        searchPlaceholder="Cerca destinazione o template"
        showPublished
        resultsId="risultati-partenze"
      />
      <p className="text-center text-xs text-muted-foreground">
        {visible.length}{' '}
        {visible.length === 1 ? 'partenza' : 'partite'} · filtri e ricerca aggiornano l’elenco
      </p>
      <ul id="risultati-partenze" className="space-y-2.5">
        {visible.length === 0 ? (
          <li className="rounded-2xl border border-white/10 bg-[#0b1220]/60 px-4 py-8 text-center text-sm text-white/70">
            Nessuna partenza con questi filtri.
          </li>
        ) : (
          visible.map(({ ed, tpl, cover }) => (
            <li
              key={ed.id}
              className={cn(
                'flex gap-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/75 p-2.5',
                'transition hover:border-white/25 hover:bg-[#121a2b]'
              )}
            >
              <div className="relative h-[4.75rem] w-[6.5rem] shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-36">
                <Image src={cover} alt="" fill className="object-cover" sizes="144px" />
                {tpl ? (
                  <p className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                    {tpl.duration_days}g
                  </p>
                ) : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
                <p className="font-display text-lg font-semibold leading-tight text-white sm:text-xl">
                  {tpl?.destination_name ?? ed.template_id}
                </p>
                <p className="text-sm text-white/75">
                  {formatItDate(ed.date_from)} – {formatItDate(ed.date_to)}
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-white/60">
                    {ed.confirmed_count}/{ed.min_confirmed} confermati
                  </p>
                  {ed.id.startsWith('seed-') ? (
                    <span className="text-xs text-white/40">Presto</span>
                  ) : (
                    <Button asChild size="sm" className="rounded-full">
                      <Link href={`/partenze/${ed.id}`}>Partecipa</Link>
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
