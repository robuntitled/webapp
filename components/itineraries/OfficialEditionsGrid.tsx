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
import {
  editionDestinationName,
  editionDestinationSlug,
  filterEditionsByDestinationSlug,
} from '@/lib/itineraries/public-destinations';

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
        'flex w-full flex-col rounded-2xl border bg-white shadow-sm transition hover:shadow-md',
        highlight ? 'border-accent/40 ring-1 ring-accent/20' : 'border-slate-200 hover:border-primary/30'
      )}
    >
      <div className="relative aspect-[3/1] w-full shrink-0 overflow-hidden rounded-t-2xl">
        <Image
          src={cover}
          alt={destination}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
        />
        <span
          className={cn(
            'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[clamp(0.65rem,0.5vw+0.58rem,0.72rem)] font-semibold leading-tight tracking-wide shadow-md',
            SCARCITY_STYLES[scarcity.variant]
          )}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="flex flex-col gap-[0.65rem] p-[clamp(0.9rem,1.2vw,1.15rem)]">
        <h3 className="font-display text-[clamp(1.15rem,0.35vw+1.05rem,1.35rem)] font-bold leading-snug text-slate-900">
          {destination}
        </h3>

        <div className="space-y-0.5">
          <p className="text-[clamp(0.92rem,0.2vw+0.86rem,1rem)] font-medium leading-snug text-slate-700">
            {formatEditionDateRange(ed.date_from, ed.date_to)}
          </p>
          {tripDuration ? (
            <p className="text-[clamp(0.82rem,0.15vw+0.78rem,0.9rem)] leading-snug text-slate-500">
              {tripDuration}
            </p>
          ) : null}
        </div>

        {participants ? (
          <p className="text-[clamp(0.88rem,0.2vw+0.84rem,0.95rem)] leading-snug text-slate-600">
            {participants}
          </p>
        ) : null}

        <section
          className="mt-1 w-full space-y-2 border-t border-slate-100 pt-3"
          aria-labelledby={`group-status-${ed.id}`}
        >
          <p
            id={`group-status-${ed.id}`}
            className="text-[clamp(0.68rem,0.1vw+0.64rem,0.75rem)] font-semibold uppercase tracking-[0.14em] text-slate-400"
          >
            Stato del gruppo
          </p>
          <p className="text-[clamp(0.88rem,0.2vw+0.84rem,0.95rem)] font-medium leading-snug text-slate-800">
            <span aria-hidden="true">✈ </span>
            {flightsStatus}
          </p>
          <div
            role="progressbar"
            aria-valuenow={confirmed}
            aria-valuemin={0}
            aria-valuemax={Math.max(minConfirmed, 1)}
            aria-label={flightsStatus}
            className="h-2.5 w-full rounded-full bg-slate-200"
          >
            <div
              className={cn(
                'h-full rounded-full transition-all',
                PROGRESS_STYLES[scarcity.variant]
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[clamp(0.78rem,0.15vw+0.74rem,0.85rem)] leading-snug text-slate-500">
            {groupHint}
          </p>
        </section>

        <div className="mt-1 pt-0.5">
          <Button
            asChild
            size="sm"
            className="rounded-full bg-accent px-5 text-[clamp(0.88rem,0.15vw+0.84rem,0.95rem)] text-white hover:bg-accent/90"
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
  destinationSlug,
  destinationName,
  onBack,
}: {
  editions: OfficialEditionCard[];
  filters?: CatalogFilterState;
  onFiltersChange?: (next: CatalogFilterState) => void;
  showFiltersBar?: boolean;
  /** Filtra le partenze per meta (livello istanze). */
  destinationSlug?: string;
  destinationName?: string;
  onBack?: () => void;
}) {
  const [internalFilters, setInternalFilters] =
    useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);
  const filters = controlledFilters ?? internalFilters;
  const setFilters = onFiltersChange ?? setInternalFilters;

  const scopedEditions = useMemo(
    () =>
      destinationSlug ? filterEditionsByDestinationSlug(editions, destinationSlug) : editions,
    [editions, destinationSlug]
  );

  const resolvedDestinationName = useMemo(() => {
    if (destinationName) return destinationName;
    if (!destinationSlug) return null;
    const first = scopedEditions[0];
    return first ? editionDestinationName(first) : destinationSlug;
  }, [destinationName, destinationSlug, scopedEditions]);

  const enriched = useMemo(
    () =>
      scopedEditions.map((ed, i) => {
        const tpl = findItineraryTemplate(ed.template_id);
        const slug = editionDestinationSlug(ed);
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
    [scopedEditions]
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
      {destinationSlug && onBack ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-primary"
          >
            ← Tutte le destinazioni
          </button>
          {resolvedDestinationName ? (
            <h2 className="font-display text-[clamp(1.35rem,1.8vw,1.75rem)] font-semibold tracking-tight text-slate-900">
              {resolvedDestinationName}
            </h2>
          ) : null}
        </div>
      ) : null}
      <p className="text-center text-sm font-medium text-slate-600 sm:text-left">
        {visible.length}{' '}
        {visible.length === 1 ? 'partenza' : 'partenze'}
        {resolvedDestinationName ? ` · ${resolvedDestinationName}` : ''}
        {filters.duration != null ? ` · ${filters.duration} giorni` : ''}
        {filters.priceMax != null
          ? ` · ≤ ${filters.priceMax.toLocaleString('it-IT')} €`
          : ''}
        {!destinationSlug && filters.continent !== 'Tutte' ? ` · ${filters.continent}` : ''}
      </p>
      {!showFiltersBar && !destinationSlug ? (
        <ContinentFilterRow
          value={filters.continent}
          onChange={(continent) => setFilters({ ...filters, continent })}
        />
      ) : null}
      <div className="nl-editions-frame space-y-5">
        {featured.length > 0 && filters.query.trim() === '' && filters.continent === 'Tutte' ? (
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              In evidenza
            </p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {featured.map(({ featured: _f, dest: _d, name: _n, continent: _c, ...item }) => (
                <EditionCard key={item.ed.id} {...item} highlight />
              ))}
            </ul>
          </section>
        ) : null}
        <ul id="risultati-partenze" className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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
    </div>
  );
}
