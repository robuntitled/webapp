'use client';

import { useMemo, useState } from 'react';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
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
      <section className="relative isolate -mt-[var(--nl-nav-height)] flex h-[min(38vh,22rem)] min-h-[16rem] flex-col overflow-visible pt-[var(--nl-nav-height)] sm:h-[min(46vh,28rem)] sm:min-h-[20rem]">
        <div className="absolute inset-0 overflow-hidden">
          <HeroBackground
            images={BRAND_IMAGES.heroes.slideshow}
            overlay="dark"
            className="!z-0"
            intervalMs={6500}
          />
        </div>
        <div className="relative z-10 nl-page flex w-full flex-1 flex-col items-center justify-center gap-2 pb-7 pt-3 text-center sm:gap-3 sm:pb-8 sm:pt-4">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white drop-shadow sm:text-3xl md:text-5xl">
            Unisciti a un viaggio
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-snug text-white/90 drop-shadow sm:text-[19px] md:text-[22px]">
            Partenze già create — pubbliche e private — a cui puoi partecipare.
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-1/2">
          <div className="nl-page pointer-events-auto w-full">
            <CatalogHeroSearchBar
              value={filters}
              onChange={setFilters}
              placeholder="Cerca destinazione, date o durata"
              resultsId="risultati-partenze"
              durationOptions={durationOptions}
            />
          </div>
        </div>
      </section>

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
