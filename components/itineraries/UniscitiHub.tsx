'use client';

import { useMemo, useState } from 'react';
import { CatalogPageHero } from '@/components/itineraries/CatalogPageHero';
import {
  CatalogHeroSearchBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { CatalogBrowseChrome } from '@/components/itineraries/HomePathSelector';
import { OfficialEditionsGrid } from '@/components/itineraries/OfficialEditionsGrid';
import { PrivateTripsSection } from '@/components/itineraries/PrivateTripsSection';
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

  const privateEditions = useMemo(
    () => editions.filter((e) => e.edition_type === 'private'),
    [editions]
  );
  const publicEditions = useMemo(
    () => editions.filter((e) => e.edition_type !== 'private'),
    [editions]
  );

  return (
    <div className="composer-shell relative min-h-[calc(100vh-4rem)] overflow-visible bg-white">
      <CatalogPageHero
        compact
        title="Un posto nel gruppo, già pronto."
        subtitle="Entra nel gruppo, aspetta la soglia, prenota il volo."
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

      <CatalogBrowseChrome
        compact
        path="unisciti"
        continent={filters.continent}
        onContinentChange={(continent) => setFilters({ ...filters, continent })}
      >
        <PrivateTripsSection editions={privateEditions} filters={filters} />
        <OfficialEditionsGrid
          editions={publicEditions}
          filters={filters}
          onFiltersChange={setFilters}
          showFiltersBar={false}
        />
      </CatalogBrowseChrome>
    </div>
  );
}
