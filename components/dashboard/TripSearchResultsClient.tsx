'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TripDiscoverSearchBar } from '@/components/dashboard/TripDiscoverSearchBar';
import { DiscoverResultsSplit } from '@/components/dashboard/DiscoverResultsSplit';
import type { TripWithRelations } from '@/types/trip';
import type { Session } from 'next-auth';
import {
  explainEmptyDiscover,
  filterDiscoverResults,
  parseDiscoverSearchParams,
  type DiscoverSearchFilters,
} from '@/lib/trips/discover-search';

export function TripSearchResultsClient({
  initialTrips,
  session,
}: {
  initialTrips: TripWithRelations[];
  session: Session | null;
}) {
  const searchParams = useSearchParams();
  const userId = session?.user?.id;

  const priceBounds = useMemo(() => {
    const prices = initialTrips.map((t) => Number(t.price) || 0).filter((p) => p >= 0);
    const dataMax = prices.length ? Math.max(...prices) : 500;
    const max = Math.max(500, Math.ceil(dataMax / 50) * 50);
    return { min: 0, max };
  }, [initialTrips]);

  const [filters, setFilters] = useState<DiscoverSearchFilters>(() => {
    const parsed = parseDiscoverSearchParams(new URLSearchParams(searchParams.toString()));
    const max = parsed.priceRange[1] >= 50_000 ? priceBounds.max : parsed.priceRange[1];
    return { ...parsed, priceRange: [parsed.priceRange[0], max] };
  });

  const results = useMemo(
    () => filterDiscoverResults(initialTrips, filters, userId),
    [initialTrips, filters, userId]
  );

  const emptyReason = useMemo(() => {
    if (results.length > 0) return null;
    return explainEmptyDiscover(initialTrips, userId);
  }, [results.length, initialTrips, userId]);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <TripDiscoverSearchBar
        filters={filters}
        onChange={setFilters}
        priceBounds={priceBounds}
      />

      <div className="container mx-auto px-4 py-8 pb-24 max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-white">
            Viaggi sulla mappa
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {results.length}{' '}
            {results.length === 1 ? 'viaggio aperto trovato' : 'viaggi aperti trovati'}
          </p>
        </div>

        <DiscoverResultsSplit
          trips={results}
          session={session}
          emptyBody={
            emptyReason === 'own-solo-only'
              ? 'I viaggi che organizzi tu non compaiono qui. Esci e accedi con un altro account per vederli, oppure invita amici al tuo viaggio.'
              : emptyReason === 'no-solo'
                ? 'Nessun viaggio in modalità «Solo (aperto)». In Crea viaggio scegli «Chi parte? → Solo» e pubblica.'
                : emptyReason === 'past-or-full'
                  ? 'I viaggi aperti sono già partiti o al completo. Pubblicane uno con date future e posti liberi.'
                  : 'Allarga date o prezzo dalla barra in alto.'
          }
        />

        <p className="mt-10 text-center text-sm text-white/50">
          Vuoi lanciare tu?{' '}
          <Link href="/dashboard/crea?new=1" className="text-white underline underline-offset-4">
            Parti da un template
          </Link>
        </p>
      </div>
    </div>
  );
}
