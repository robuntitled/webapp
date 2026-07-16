'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { TripCard } from '@/components/trips/TripCard';
import { TripDiscoverSearchBar } from '@/components/dashboard/TripDiscoverSearchBar';
import type { TripWithRelations } from '@/types/trip';
import { Compass, Plus } from 'lucide-react';
import { type Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { filterDiscoverResults } from '@/lib/trips/discover-search';
import { isOpenSoloTrip, isTripCreator } from '@/lib/trips/display';

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

  const defaultFilters = useMemo(
    () => ({
      searchTerm: '',
      dateRange: undefined,
      priceRange: [priceBounds.min, priceBounds.max] as [number, number],
    }),
    [priceBounds]
  );

  const results = useMemo(
    () => filterDiscoverResults(initialTrips, defaultFilters, userId),
    [initialTrips, defaultFilters, userId]
  );

  const emptyReason = useMemo(() => {
    if (results.length > 0) return null;
    const soloTrips = initialTrips.filter(isOpenSoloTrip);
    const ownSolo = userId ? soloTrips.filter((t) => isTripCreator(t, userId)) : [];
    if (ownSolo.length > 0) return 'own-solo-only';
    if (soloTrips.length === 0) return 'no-solo';
    return 'filters';
  }, [results.length, initialTrips, userId]);

  return (
    <div className="relative z-0 container mx-auto px-4 pt-10 pb-24">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <p className="text-accent font-medium text-sm uppercase tracking-widest mb-3">
          Meno WhatsApp, più viaggio
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold text-white leading-tight">
          Trova un viaggio e unisciti in modalità relax
        </h1>
        <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
          Cerca viaggi aperti a cui unirti. Gli inviti tra amici arrivano via WhatsApp — qui
          compaiono solo i viaggi organizzati da una persona.
        </p>
        {session?.user && (
          <Button asChild className="mt-6 rounded-full gap-2">
            <Link href="/dashboard/crea">
              <Plus className="h-4 w-4" />
              Organizza il tuo viaggio
            </Link>
          </Button>
        )}
      </div>

      <TripDiscoverSearchBar variant="hero" priceBounds={priceBounds} />

      <div className="mt-12 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="font-display text-xl md:text-2xl font-semibold text-white">
            Viaggi disponibili
          </h2>
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
          <div className="text-center py-16 px-4 rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
              <Compass className="h-7 w-7 text-accent" />
            </div>
            <h3 className="font-display text-xl text-white font-semibold">Nessun viaggio trovato</h3>
            <p className="mt-2 text-white/60 max-w-md mx-auto text-sm">
              {emptyReason === 'own-solo-only'
                ? 'I viaggi che organizzi tu non compaiono qui — prova con un altro account o invita amici al tuo viaggio.'
                : emptyReason === 'no-solo'
                  ? 'Nessun viaggio in modalità Solo al momento. Pubblica il tuo con «Chi parte? → Solo».'
                  : 'Prova a modificare i filtri di ricerca.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}