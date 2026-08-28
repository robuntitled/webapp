'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  CatalogHeroSearchBar,
  ContinentFilterRow,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatEditionDateRange, formatItDate } from '@/lib/itineraries/dates';
import {
  editionBadgeDisplay,
  editionFlightsStatusLabel,
  editionGroupHint,
  editionParticipantsLabel,
  editionScarcity,
  editionThresholdProgress,
} from '@/lib/itineraries/edition-present';
import { cn } from '@/lib/utils';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

function durationFromId(templateId: string, fallback?: number | null) {
  if (fallback != null) return fallback;
  const m = templateId.match(/-(\d+)d(?:-|$)/i);
  return m ? Number(m[1]) : null;
}

const SCARCITY_STYLES = {
  open: 'bg-primary text-white',
  warming: 'bg-accent text-white',
  closing: 'bg-accent text-white',
  formed: 'bg-emerald-600 text-white',
} as const;

const PROGRESS_STYLES = {
  open: 'bg-primary',
  warming: 'bg-accent',
  closing: 'bg-accent',
  formed: 'bg-emerald-600',
} as const;

function durationLabel(days: number | null): string | null {
  if (days == null) return null;
  return days === 1 ? '1 giorno' : `${days} giorni`;
}

function EditionCard({
  ed,
  tpl,
  cover,
  days,
  scarcity,
  progress,
  highlight = false,
}: {
  ed: OfficialEditionCard;
  tpl: ReturnType<typeof findItineraryTemplate>;
  cover: string;
  days: number | null;
  scarcity: ReturnType<typeof editionScarcity>;
  progress: number;
  highlight?: boolean;
}) {
  const destination = tpl?.destination_name ?? ed.template_id;
  const confirmed = ed.confirmed_count ?? 0;
  const minConfirmed = ed.min_confirmed;
  const spotsLeft = Math.max(0, minConfirmed - confirmed);
  const badgeLabel = editionBadgeDisplay(scarcity, spotsLeft);
  const participants = editionParticipantsLabel({
    interested_count: ed.interested_count,
    confirmed_count: confirmed,
  });
  const flightsStatus = editionFlightsStatusLabel(confirmed, minConfirmed);
  const groupHint = editionGroupHint(confirmed, minConfirmed);
  const tripDuration = durationLabel(days);

  return (
    <li
      className={cn(
        'grid w-full overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md',
        'grid-cols-1 sm:grid-cols-[minmax(160px,38%)_minmax(0,1fr)] sm:items-stretch sm:gap-5 sm:p-5',
        highlight ? 'border-accent/40 ring-1 ring-accent/20' : 'border-slate-200 hover:border-primary/30'
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-auto sm:min-h-[180px] sm:rounded-xl">
        <Image
          src={cover}
          alt={destination}
          fill
          className="object-cover sm:rounded-xl"
          sizes="(max-width: 640px) 100vw, 180px"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3 p-4 sm:gap-3.5 sm:p-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 font-display text-xl font-bold leading-snug text-slate-900">
            {destination}
          </h3>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-tight tracking-wide shadow-sm',
              SCARCITY_STYLES[scarcity.variant]
            )}
          >
            {badgeLabel}
          </span>
        </div>

        <div className="space-y-0.5">
          <p className="text-sm font-medium leading-snug text-slate-700 sm:whitespace-nowrap">
            {formatEditionDateRange(ed.date_from, ed.date_to)}
          </p>
          {tripDuration ? (
            <p className="text-sm text-slate-500">{tripDuration}</p>
          ) : null}
        </div>

        {participants ? (
          <p className="text-sm leading-snug text-slate-600 sm:whitespace-nowrap">{participants}</p>
        ) : null}

        <section
          className="w-full space-y-2 border-t border-slate-100 pt-3"
          aria-labelledby={`group-status-${ed.id}`}
        >
          <p
            id={`group-status-${ed.id}`}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
          >
            Stato del gruppo
          </p>
          <p className="text-sm font-medium leading-snug text-slate-800 sm:whitespace-nowrap">
            <span aria-hidden="true">✈ </span>
            {flightsStatus}
          </p>
          <div
            role="progressbar"
            aria-valuenow={confirmed}
            aria-valuemin={0}
            aria-valuemax={Math.max(minConfirmed, 1)}
            aria-label={flightsStatus}
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
          >
            <div
              className={cn(
                'h-full rounded-full transition-all',
                PROGRESS_STYLES[scarcity.variant]
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs leading-snug text-slate-500 sm:whitespace-nowrap">{groupHint}</p>
        </section>

        <div className="pt-0.5">
          <Button
            asChild
            size="sm"
            className="rounded-full bg-accent px-5 text-white hover:bg-accent/90"
          >
            <Link href={`/partenze/${ed.id}`}>Partecipa</Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

function featuredScore(ed: OfficialEditionCard): number {
  const scarcity = editionScarcity(ed);
  if (scarcity.variant === 'closing') return 4;
  if (scarcity.variant === 'formed') return 3;
  if (scarcity.variant === 'warming') return 2;
  if ((ed.interested_count ?? 0) > 0) return 1;
  return 0;
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
        const scarcity = editionScarcity(ed);
        const progress = editionThresholdProgress(ed.confirmed_count ?? 0, ed.min_confirmed);
        return {
          ed,
          tpl,
          dest,
          days,
          scarcity,
          progress,
          cover: uniqueCover(slug || ed.template_id, i),
          name: (tpl?.destination_name ?? (slug || ed.template_id)).toLowerCase(),
          continent: dest?.continent ?? 'Asia',
          featured: featuredScore(ed),
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
    return enriched.filter(({ ed, tpl, dest, name, continent, days }) => {
      if (filters.continent !== 'Tutte' && continent !== filters.continent) return false;
      if (filters.duration != null && (days == null || days !== filters.duration)) return false;
      if (filters.priceMax != null) {
        const budget = tpl?.budget_orientative_eur.total_hint;
        if (budget != null && budget > filters.priceMax) return false;
      }
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

  const featured = useMemo(
    () =>
      [...visible]
        .filter((e) => e.featured > 0)
        .sort((a, b) => b.featured - a.featured)
        .slice(0, 2),
    [visible]
  );

  const featuredIds = useMemo(() => new Set(featured.map((e) => e.ed.id)), [featured]);
  const regular = useMemo(
    () => visible.filter((e) => !featuredIds.has(e.ed.id)),
    [visible, featuredIds]
  );

  return (
    <div className="space-y-5">
      {showFiltersBar ? (
        <CatalogHeroSearchBar
          value={filters}
          onChange={setFilters}
          placeholder="Cerca destinazione o date"
          resultsId="risultati-partenze"
          durationOptions={durationOptions}
        />
      ) : null}
      <p className="text-center text-sm font-medium text-slate-600">
        {visible.length}{' '}
        {visible.length === 1 ? 'partenza' : 'partite'}
        {filters.duration != null ? ` · ${filters.duration} giorni` : ''}
        {filters.priceMax != null
          ? ` · ≤ ${filters.priceMax.toLocaleString('it-IT')} €`
          : ''}
        {filters.continent !== 'Tutte' ? ` · ${filters.continent}` : ''}
      </p>
      {!showFiltersBar ? (
        <ContinentFilterRow
          value={filters.continent}
          onChange={(continent) => setFilters({ ...filters, continent })}
        />
      ) : null}
      {featured.length > 0 && filters.query.trim() === '' && filters.continent === 'Tutte' ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            In evidenza
          </p>
          <ul className="grid gap-4 lg:grid-cols-2">
            {featured.map(({ featured: _f, dest: _d, name: _n, continent: _c, ...item }) => (
              <EditionCard key={item.ed.id} {...item} highlight />
            ))}
          </ul>
        </section>
      ) : null}
      <ul id="risultati-partenze" className="grid gap-4 lg:grid-cols-2">
        {visible.length === 0 ? (
          <li className="col-span-full rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
            Nessuna partenza con questi filtri. Azzera continente o apri Giorni → Tutti.
          </li>
        ) : (
          regular.map(({ featured: _f, dest: _d, name: _n, continent: _c, ...item }) => (
            <EditionCard key={item.ed.id} {...item} />
          ))
        )}
      </ul>
    </div>
  );
}
