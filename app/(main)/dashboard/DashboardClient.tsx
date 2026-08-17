'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { TripDiscoverSearchBar } from '@/components/dashboard/TripDiscoverSearchBar';
import { DiscoverResultsSplit } from '@/components/dashboard/DiscoverResultsSplit';
import type { TripWithRelations } from '@/types/trip';
import { Plus } from 'lucide-react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { type Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { explainEmptyDiscover, filterDiscoverResults } from '@/lib/trips/discover-search';

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
    return explainEmptyDiscover(initialTrips, userId);
  }, [results.length, initialTrips, userId]);

  return (
    <div className="relative z-0 pb-24">
      <div className="container mx-auto px-4 pt-10 mb-8 text-center max-w-3xl">
        <ScrollReveal variant="decor">
          <p className="text-accent font-medium text-sm uppercase tracking-widest mb-3">
            Meno WhatsApp, più viaggio
          </p>
        </ScrollReveal>
        <ScrollReveal variant="title">
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-white leading-tight">
            Quando vuoi partire?
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="title" stagger={1}>
          <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
            Destinazione, date, mappa. I filtri restano in alto. Apri un viaggio e trovi il carrello
            servizi.
          </p>
        </ScrollReveal>
        {session?.user && (
          <ScrollReveal variant="card" stagger={2}>
            <Button asChild className="mt-6 rounded-full gap-2">
              <Link href="/dashboard/crea?new=1">
                <Plus className="h-4 w-4" />
                Crea un viaggio
              </Link>
            </Button>
          </ScrollReveal>
        )}
      </div>

      <TripDiscoverSearchBar variant="compact" priceBounds={priceBounds} />

      <div className="container mx-auto px-4 mt-8 max-w-7xl">
        <div className="mb-6">
          <h2 className="font-display text-xl md:text-2xl font-semibold text-white">
            Viaggi sulla mappa
          </h2>
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
              ? 'I viaggi che organizzi tu non compaiono qui — esci e accedi con un altro account, o invita amici al tuo viaggio.'
              : emptyReason === 'no-solo'
                ? 'Nessun viaggio in modalità «Solo (aperto)». In Crea viaggio scegli «Chi parte? → Solo» e pubblica.'
                : emptyReason === 'past-or-full'
                  ? 'I viaggi aperti sono già partiti o al completo. Pubblicane uno con date future e posti liberi.'
                  : 'Prova a modificare i filtri di ricerca.'
          }
        />
      </div>
    </div>
  );
}
