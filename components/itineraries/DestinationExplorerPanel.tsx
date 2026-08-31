'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { CATALOG_CONTINENTS } from '@/lib/catalog/destinations';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { cn } from '@/lib/utils';

const INITIAL_VISIBLE = 6;

export type ExplorerDestination = {
  slug: string;
  name: string;
  vibe: string;
  emoji: string;
  continent?: string;
  published?: boolean;
};

function ContinentTabBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (continent: string) => void;
}) {
  const tabs = ['Tutte', ...CATALOG_CONTINENTS];

  return (
    <div
      className="overflow-x-auto border-b border-slate-200/60 bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/62"
      role="tablist"
      aria-label="Filtra per continente"
    >
      <div className="flex min-w-max px-1 sm:px-2">
        {tabs.map((tab) => {
          const active = value === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab)}
              className={cn(
                'relative shrink-0 px-4 py-3.5 text-[clamp(0.82rem,0.25vw+0.78rem,0.95rem)] font-medium tracking-tight transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2',
                active
                  ? 'text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DestinationStateCard({
  dest,
  cover,
  onSelect,
}: {
  dest: ExplorerDestination;
  cover: string;
  onSelect: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200/90 bg-white transition duration-150 hover:border-primary/35 hover:shadow-sm">
      <button
        type="button"
        onClick={onSelect}
        className="block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={cover}
            alt={dest.name}
            fill
            className="object-cover transition duration-200 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
          {dest.published === false ? (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Presto
            </span>
          ) : null}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-display text-lg font-semibold leading-tight text-white drop-shadow sm:text-xl">
              {dest.emoji ? `${dest.emoji} ` : ''}
              {dest.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-white/90 drop-shadow sm:text-sm">
              {dest.vibe}
            </p>
          </div>
        </div>
      </button>
    </article>
  );
}

function ContinentSection({
  continent,
  items,
  coverBySlug,
  onSelect,
}: {
  continent: string;
  items: ExplorerDestination[];
  coverBySlug: Record<string, string>;
  onSelect: (dest: ExplorerDestination) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, items.length - INITIAL_VISIBLE);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="font-display text-[clamp(1.05rem,1vw+0.95rem,1.25rem)] font-semibold text-slate-900">
          {continent}
        </h2>
        <span className="text-sm text-slate-500">
          · {items.length}{' '}
          {items.length === 1 ? 'destinazione' : 'destinazioni'}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {visible.map((dest) => (
          <DestinationStateCard
            key={dest.slug}
            dest={dest}
            cover={coverBySlug[dest.slug] ?? coverForDestination(dest.slug)}
            onSelect={() => onSelect(dest)}
          />
        ))}
      </div>

      {hiddenCount > 0 ? (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-semibold text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:rounded-md px-2 py-1"
          >
            {expanded ? 'Mostra meno' : `Vedi altri ${hiddenCount}`}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function DestinationExplorerPanel({
  destinations,
  continent,
  onContinentChange,
  onSelectDestination,
  coverBySlug,
  resultsId = 'risultati-destinazioni',
}: {
  destinations: ExplorerDestination[];
  continent: string;
  onContinentChange: (continent: string) => void;
  onSelectDestination: (dest: ExplorerDestination) => void;
  coverBySlug: Record<string, string>;
  /** @deprecated CTA rimosse: l'intera card è cliccabile */
  ctaLabel?: string;
  resultsId?: string;
}) {
  const sections = useMemo(() => {
    const order = [...CATALOG_CONTINENTS];
    return order
      .map((c) => ({
        continent: c,
        items: destinations.filter((d) => d.continent === c),
      }))
      .filter((s) => s.items.length > 0);
  }, [destinations]);

  const visibleSections =
    continent === 'Tutte'
      ? sections
      : sections.filter((s) => s.continent === continent);

  return (
    <div
      id={resultsId}
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/90"
    >
      <ContinentTabBar value={continent} onChange={onContinentChange} />

      <div className="space-y-8 p-4 sm:p-5 md:p-6">
        {visibleSections.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600">
            Nessuna destinazione con questo filtro.
          </p>
        ) : (
          visibleSections.map((section) => (
            <ContinentSection
              key={section.continent}
              continent={section.continent}
              items={section.items}
              coverBySlug={coverBySlug}
              onSelect={onSelectDestination}
            />
          ))
        )}
      </div>
    </div>
  );
}
