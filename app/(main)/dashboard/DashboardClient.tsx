'use client';

import { useMemo, useState } from 'react';
import { TripDiscoverSearchBar } from '@/components/dashboard/TripDiscoverSearchBar';
import { DiscoverResultsSplit } from '@/components/dashboard/DiscoverResultsSplit';
import type { TripWithRelations } from '@/types/trip';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { type Session } from 'next-auth';
import {
  EMPTY_DISCOVER_FILTERS,
  filterDiscoverResults,
  type DiscoverSearchFilters,
} from '@/lib/trips/discover-search';

export default function DashboardClient({
  initialTrips,
  session,
}: {
  initialTrips: TripWithRelations[];
  session: Session | null;
}) {
  const userId = session?.user?.id;

  const priceBounds = useMemo(() => {
    const prices = initialTrips.map((t) => Number(t.price) || 0).filter((p) => p >= 0);
    const dataMax = prices.length ? Math.max(...prices) : 500;
    const max = Math.max(500, Math.ceil(dataMax / 50) * 50);
    return { min: 0, max };
  }, [initialTrips]);

  const [filters, setFilters] = useState<DiscoverSearchFilters>(() => ({
    ...EMPTY_DISCOVER_FILTERS,
    priceRange: [priceBounds.min, priceBounds.max],
  }));

  const results = useMemo(
    () => filterDiscoverResults(initialTrips, filters, userId),
    [initialTrips, filters, userId]
  );

  const scrollToResults = () => {
    document.getElementById('risultati')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative z-0 pb-24">
      <div className="mx-auto w-full max-w-4xl px-4 pb-8 pt-14 text-center md:pt-20">
        <ScrollReveal variant="decor">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            Esplora
          </p>
        </ScrollReveal>
        <ScrollReveal variant="title">
          <h1 className="mx-auto font-display text-[clamp(1.35rem,4.1vw,2.65rem)] font-semibold leading-none tracking-tight text-foreground sm:whitespace-nowrap">
            Il gruppo c’è già. Manchi solo tu.
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="title" stagger={1}>
          <p className="mx-auto mt-3 font-display text-[clamp(0.95rem,2.2vw,1.2rem)] leading-none text-muted-foreground sm:whitespace-nowrap">
            Zero tour operator. Prenoti quando vuoi.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-8 max-w-3xl text-left">
          <TripDiscoverSearchBar
            variant="inline"
            filters={filters}
            onChange={setFilters}
            onSubmit={scrollToResults}
            priceBounds={priceBounds}
          />
        </div>
      </div>

      <div id="risultati" className="mx-auto mt-4 w-full max-w-4xl scroll-mt-24 px-4">
        {results.length > 0 ? (
          <section>
            <p className="mb-5 text-center text-sm text-muted-foreground">
              {results.length}{' '}
              {results.length === 1 ? 'viaggio aperto' : 'viaggi aperti'}
            </p>
            <DiscoverResultsSplit trips={results} session={session} />
          </section>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nessun viaggio con questi filtri. Prova un’altra meta o allarga le date.
          </p>
        )}
      </div>
    </div>
  );
}
