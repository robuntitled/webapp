'use client';

import { useMemo, useState } from 'react';
import { CatalogPageHero } from '@/components/itineraries/CatalogPageHero';
import {
  CatalogHeroSearchBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { HomePathSelector } from '@/components/itineraries/HomePathSelector';
import { JoinTripLinkDialog } from '@/components/itineraries/JoinTripLinkDialog';
import { OfficialEditionsGrid } from '@/components/itineraries/OfficialEditionsGrid';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

export function UniscitiHub({ editions }: { editions: OfficialEditionCard[] }) {
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);

  const durationOptions = useMemo(() => {
    const days = editions.map((e) => {
      const m = e.template_id.match(/-(\d+)d(?:-|$)/i);
      return m ? Number(m[1]) : null;
    });
    return [...new Set(days.filter((d): d is number => d != null))].sort((a, b) => a - b);
  }, [editions]);

  return (
    <div className="composer-shell relative min-h-[calc(100vh-4rem)] overflow-visible bg-white">
      <CatalogPageHero
        title="Unisciti a un viaggio"
        subtitle="Partenze già create — pubbliche e private — a cui puoi partecipare."
        search={
          <CatalogHeroSearchBar
            value={filters}
            onChange={setFilters}
            placeholder="Cerca destinazione, date o durata"
            resultsId="risultati-partenze"
            durationOptions={durationOptions}
          />
        }
      />

      <div className="nl-home-content relative z-10 min-h-0 w-full pt-16 pb-16">
        <div className="mb-6 grid w-full items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="hidden sm:block" />
          <HomePathSelector value="unisciti" />
          <div className="flex justify-center sm:justify-end">
            <JoinTripLinkDialog />
          </div>
        </div>
        <OfficialEditionsGrid
          editions={editions}
          filters={filters}
          onFiltersChange={setFilters}
          showFiltersBar={false}
        />
      </div>
    </div>
  );
}
