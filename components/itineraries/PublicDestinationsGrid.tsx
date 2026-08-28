'use client';

import Image from 'next/image';
import { CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { coverForDestination } from '@/lib/composer/destination-covers';
import type { CatalogFilterState } from '@/components/itineraries/CatalogFiltersBar';
import {
  aggregatePublicDestinations,
  partenzeCtaLabel,
  type PublicDestinationSummary,
} from '@/lib/itineraries/public-destinations';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

function PublicDestinationCard({
  destination,
  onSelect,
}: {
  destination: PublicDestinationSummary;
  onSelect: (slug: string) => void;
}) {
  const cover = coverForDestination(destination.slug);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary/30 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full shrink-0">
        <Image
          src={cover}
          alt={destination.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="flex flex-col gap-3 p-[clamp(0.85rem,1.2vw,1.1rem)]">
        <h3 className="font-display text-[clamp(1rem,0.35vw+0.92rem,1.25rem)] font-bold leading-snug text-slate-900">
          {destination.name}
        </h3>
        <Button
          type="button"
          variant="outline"
          onClick={() => onSelect(destination.slug)}
          className="h-10 w-full rounded-xl border-slate-200 bg-white text-[clamp(0.85rem,0.25vw+0.8rem,0.95rem)] font-semibold text-accent hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
        >
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          {partenzeCtaLabel(destination.editionCount)}
        </Button>
      </div>
    </li>
  );
}

export function PublicDestinationsGrid({
  editions,
  filters,
  onSelectDestination,
}: {
  editions: OfficialEditionCard[];
  filters?: CatalogFilterState;
  onSelectDestination: (slug: string) => void;
}) {
  const destinations = useMemo(() => {
    let list = aggregatePublicDestinations(editions);
    const q = filters?.query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [editions, filters?.query]);

  return (
    <div className="nl-editions-frame space-y-6">
      <header className="space-y-1 px-0 text-center sm:text-left">
        <h2 className="font-display text-[clamp(1.35rem,1.8vw,1.75rem)] font-semibold tracking-tight text-slate-900">
          Esplora le destinazioni
        </h2>
        <p className="text-[clamp(0.88rem,0.2vw+0.82rem,0.95rem)] text-slate-600">
          Scopri le partenze disponibili per ogni destinazione
        </p>
      </header>

      {destinations.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
          Nessuna destinazione con partenze attive{filters?.query ? ' per questa ricerca' : ''}.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {destinations.map((dest) => (
            <PublicDestinationCard
              key={dest.slug}
              destination={dest}
              onSelect={onSelectDestination}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
