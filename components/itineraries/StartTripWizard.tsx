'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { uniqueCoversForSlugs } from '@/lib/composer/destination-covers';
import { CatalogPageHero } from '@/components/itineraries/CatalogPageHero';
import {
  CatalogHeroSearchBar,
  EMPTY_CATALOG_FILTERS,
  type CatalogFilterState,
} from '@/components/itineraries/CatalogFiltersBar';
import { DestinationExplorerPanel } from '@/components/itineraries/DestinationExplorerPanel';
import { CatalogBrowseChrome } from '@/components/itineraries/HomePathSelector';
import { TripSetupPanel } from '@/components/itineraries/TripSetupPanel';
import { findItineraryBySlug, minBudgetHintForDestination } from '@/lib/itineraries/catalog';
import { cn } from '@/lib/utils';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

type Step = 'dest' | 'setup';

export function StartTripWizard({
  destinations,
  editions: _editions,
  initialSlug,
  initialDuration,
  favoriteTemplateIds = [],
}: {
  destinations: {
    slug: string;
    name: string;
    vibe: string;
    emoji: string;
    allowedDurations: number[];
    continent?: string;
    published?: boolean;
  }[];
  editions: OfficialEditionCard[];
  initialSlug?: string;
  initialDuration?: number;
  initialHomeTravelMode?: string;
  initialPublicDest?: string;
  favoriteTemplateIds?: string[];
}) {
  const startTemplate = initialSlug
    ? findItineraryBySlug(initialSlug, initialDuration)
    : undefined;
  const [step, setStep] = useState<Step>(startTemplate ? 'setup' : 'dest');
  const [slug, setSlug] = useState(startTemplate?.destination_slug ?? '');
  const [duration, setDuration] = useState(startTemplate?.duration_days ?? 0);
  const [filters, setFilters] = useState<CatalogFilterState>(EMPTY_CATALOG_FILTERS);

  const template = slug && duration ? findItineraryBySlug(slug, duration) : undefined;

  const filteredDestinations = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return destinations.filter((d) => {
      if (filters.continent !== 'Tutte' && d.continent !== filters.continent) return false;
      if (filters.duration != null && !d.allowedDurations.includes(filters.duration)) return false;
      if (filters.priceMax != null) {
        const minBudget = minBudgetHintForDestination(d.slug);
        if (minBudget != null && minBudget > filters.priceMax) return false;
      }
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.vibe.toLowerCase().includes(q) ||
        (d.continent ?? '').toLowerCase().includes(q)
      );
    });
  }, [destinations, filters]);

  const destCoverBySlug = useMemo(() => {
    const slugs = filteredDestinations.map((d) => d.slug);
    const urls = uniqueCoversForSlugs(slugs);
    return Object.fromEntries(slugs.map((s, i) => [s, urls[i]]));
  }, [filteredDestinations]);

  const durationOptions = useMemo(
    () =>
      [...new Set(destinations.flatMap((d) => d.allowedDurations))].sort((a, b) => a - b),
    [destinations]
  );

  const openDestination = (dest: (typeof destinations)[number]) => {
    if (dest.published === false) {
      toast.error('Presto. Ora parti da Thailandia.');
      return;
    }
    const preferred =
      filters.duration != null && dest.allowedDurations.includes(filters.duration)
        ? filters.duration
        : dest.allowedDurations[Math.min(1, dest.allowedDurations.length - 1)] ??
          dest.allowedDurations[0];
    if (!preferred) {
      toast.error('Presto. Ora parti da Thailandia.');
      return;
    }
    setSlug(dest.slug);
    setDuration(preferred);
    setStep('setup');
  };

  return (
    <div
      className={cn(
        'composer-shell relative min-h-[calc(100vh-4rem)] bg-white',
        'overflow-visible'
      )}
    >
      {step === 'dest' ? (
        <CatalogPageHero
          title="La tua vacanza, in tre click"
          subtitle="Scegli la destinazione, definisci date e stile, configura il viaggio."
          search={
            <CatalogHeroSearchBar
              value={filters}
              onChange={setFilters}
              placeholder="Cerca nazione, continente o vibe"
              resultsId="risultati-itinerari"
              durationOptions={durationOptions}
            />
          }
        />
      ) : null}

      <div
        className={cn(
          'relative z-10 w-full',
          step === 'dest' ? '' : 'nl-page pt-6 pb-10'
        )}
      >
        {step === 'dest' ? (
          <CatalogBrowseChrome
            path="destinazioni"
            continent={filters.continent}
            onContinentChange={(continent) => setFilters({ ...filters, continent })}
          >
            <DestinationExplorerPanel
              destinations={filteredDestinations}
              continent={filters.continent}
              onSelectDestination={(dest) => {
                const full = destinations.find((d) => d.slug === dest.slug);
                if (full) openDestination(full);
              }}
              coverBySlug={destCoverBySlug}
              resultsId="risultati-itinerari"
            />
          </CatalogBrowseChrome>
        ) : null}

        {step === 'setup' && template ? (
          <TripSetupPanel
            key={template.destination_slug}
            template={template}
            duration={duration}
            onDurationChange={setDuration}
            favoriteTemplateIds={favoriteTemplateIds}
            onBack={() => setStep('dest')}
          />
        ) : null}
      </div>
    </div>
  );
}
