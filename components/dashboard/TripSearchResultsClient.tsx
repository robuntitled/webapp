'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TripCard } from '@/components/trips/TripCard';
import { TripDiscoverSearchBar } from '@/components/dashboard/TripDiscoverSearchBar';
import type { TripWithRelations } from '@/types/trip';
import type { Session } from 'next-auth';
import { Compass, Search } from 'lucide-react';
import {
  explainEmptyDiscover,
  filterDiscoverResults,
  parseDiscoverSearchParams,
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

  const filters = useMemo(
    () => parseDiscoverSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

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
        variant="compact"
        initialFilters={filters}
        priceBounds={priceBounds}
      />

      <div className="container mx-auto px-4 py-8 pb-24 max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-white">
            Viaggi disponibili
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {results.length}{' '}
            {results.length === 1 ? 'viaggio aperto trovato' : 'viaggi aperti trovati'}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((trip) => (
              <TripCard key={trip.id} trip={trip} session={session} discover />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
              {emptyReason === 'filters' ? (
                <Search className="h-7 w-7 text-accent" />
              ) : (
                <Compass className="h-7 w-7 text-accent" />
              )}
            </div>
            <h3 className="font-display text-xl text-white font-semibold">Nessun viaggio trovato</h3>
            <p className="mt-2 text-white/60 max-w-md mx-auto text-sm">
              {emptyReason === 'own-solo-only'
                ? 'I viaggi che organizzi tu non compaiono qui. Esci e accedi con un altro account per vederli, oppure invita amici al tuo viaggio.'
                : emptyReason === 'no-solo'
                  ? 'Nessun viaggio in modalità «Solo (aperto)». In Crea viaggio scegli «Chi parte? → Solo» e pubblica.'
                  : emptyReason === 'past-or-full'
                    ? 'I viaggi aperti sono già partiti o al completo. Pubblicane uno con date future e posti liberi.'
                    : 'Allarga date o prezzo dalla barra in alto.'}
            </p>
            <Link href="/scopri" className="inline-block mt-4 text-sm text-accent hover:underline">
              Torna alla dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}