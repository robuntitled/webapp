'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { isClosingSoon, isGroupSolid } from '@/lib/trips/formation';
import { TRIP_TEMPLATES } from '@/lib/composer/trip-templates';
import { coverForDestination } from '@/lib/composer/destination-covers';

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

  const closing = useMemo(() => results.filter((t) => isClosingSoon(t)).slice(0, 6), [results]);
  const seedTrips = useMemo(
    () => results.filter((t) => !isGroupSolid(t)).slice(0, 4),
    [results]
  );
  const featuredSeeds = TRIP_TEMPLATES.filter((t) => t.featured);

  const scrollToResults = () => {
    document.getElementById('risultati')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative z-0 pb-24">
      <TripDiscoverSearchBar
        filters={filters}
        onChange={setFilters}
        onSubmit={scrollToResults}
        priceBounds={priceBounds}
      />

      <div className="container mx-auto max-w-3xl px-4 pb-8 pt-10 text-center">
        <ScrollReveal variant="decor">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Esplora
          </p>
        </ScrollReveal>
        <ScrollReveal variant="title">
          <h1 className="mx-auto max-w-xl text-center font-display text-4xl font-semibold leading-[1.1] text-white md:text-6xl">
            Il gruppo c’è già. Manca tu.
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="title" stagger={1}>
          <p className="mx-auto mt-4 max-w-lg text-center text-lg text-white/90">
            Viaggi in formazione, prezzi veri, zero markup da tour operator. Prenoti solo quando si
            parte.
          </p>
        </ScrollReveal>
      </div>

      <div id="risultati" className="container mx-auto mt-2 max-w-7xl scroll-mt-36 space-y-10 px-4">
        <section>
          <h2 className="text-center font-display text-xl font-semibold text-white md:text-2xl">
            In evidenza
          </h2>
          <p className="mt-1 text-center text-sm text-white/85">
            Modelli pronti e viaggi che si stanno riempiendo.
          </p>
          {seedTrips.length > 0 ? (
            <div className="mt-4">
              <DiscoverResultsSplit trips={seedTrips} session={session} />
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredSeeds.map((tpl) => {
              const cover = coverForDestination(tpl.destinationId);
              return (
                <Link
                  key={tpl.id}
                  href={`/dashboard/crea?new=1&template=${encodeURIComponent(tpl.id)}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] hover:border-white/25"
                >
                  <div className="relative h-36">
                    <Image
                      src={cover}
                      alt={tpl.label}
                      fill
                      sizes="(max-width: 640px) 100vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <p className="absolute bottom-2 left-3 right-3 font-medium text-white">
                      {tpl.emoji} {tpl.label}
                    </p>
                  </div>
                  <p className="px-3 py-2 text-xs text-white/80">{tpl.vibe}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {closing.length > 0 ? (
          <section>
            <h2 className="text-center font-display text-xl font-semibold text-white md:text-2xl">
              In chiusura
            </h2>
            <p className="mt-1 text-center text-sm text-white/85">
              Ultimi posti. Se ti chiama, è adesso.
            </p>
            <div className="mt-4">
              <DiscoverResultsSplit trips={closing} session={session} />
            </div>
          </section>
        ) : null}

        {results.length > 0 ? (
          <section>
            <div className="mb-6 text-center">
              <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
                Tutti i viaggi
              </h2>
              <p className="mt-1 text-sm text-white/85">
                {results.length}{' '}
                {results.length === 1 ? 'viaggio aperto trovato' : 'viaggi aperti trovati'}
              </p>
            </div>

            <DiscoverResultsSplit trips={results} session={session} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
