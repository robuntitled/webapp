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
import { filterDiscoverResults } from '@/lib/trips/discover-search';
import { isClosingSoon } from '@/lib/trips/formation';
import { TRIP_TEMPLATES } from '@/lib/composer/trip-templates';
import { cn } from '@/lib/utils';

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

  const closing = useMemo(() => results.filter((t) => isClosingSoon(t)).slice(0, 6), [results]);
  const featuredSeeds = TRIP_TEMPLATES.filter((t) => t.featured);

  return (
    <div className="relative z-0 pb-24">
      <div className="container mx-auto px-4 pt-10 mb-8 text-center max-w-3xl">
        <ScrollReveal variant="decor">
          <p className="text-accent font-medium text-sm uppercase tracking-widest mb-3">
            Esplora
          </p>
        </ScrollReveal>
        <ScrollReveal variant="title">
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-white leading-tight">
            Qualcuno parte già. Unisciti.
          </h1>
        </ScrollReveal>
        <ScrollReveal variant="title" stagger={1}>
          <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
            Scegli un viaggio in evidenza o in chiusura. Prenoti voli e hotel solo a gruppo formato.
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

      <div className="container mx-auto px-4 mt-8 max-w-7xl space-y-10">
        <section>
          <h2 className="font-display text-xl md:text-2xl font-semibold text-white">In evidenza</h2>
          <p className="mt-1 text-sm text-white/85">Itinerari pronti: lanciali e riempi i posti.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredSeeds.map((tpl) => (
              <Link
                key={tpl.id}
                href={`/dashboard/crea?new=1&template=${encodeURIComponent(tpl.id)}`}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-white/25"
              >
                <div className={cn('mb-3 h-12 rounded-xl bg-gradient-to-br', tpl.gradient)} />
                <p className="font-medium text-white">
                  {tpl.emoji} {tpl.label}
                </p>
                <p className="mt-1 text-xs text-white/80">{tpl.vibe}</p>
              </Link>
            ))}
          </div>
        </section>

        {closing.length > 0 ? (
          <section>
            <h2 className="font-display text-xl md:text-2xl font-semibold text-white">
              In chiusura
            </h2>
            <p className="mt-1 text-sm text-white/85">Pochi posti o partenza vicina. Decidi ora.</p>
            <div className="mt-4">
              <DiscoverResultsSplit trips={closing} session={session} />
            </div>
          </section>
        ) : null}

        {results.length > 0 ? (
          <section>
            <div className="mb-6">
              <h2 className="font-display text-xl md:text-2xl font-semibold text-white">
                Tutti i viaggi
              </h2>
              <p className="mt-1 text-sm text-white/55">
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
