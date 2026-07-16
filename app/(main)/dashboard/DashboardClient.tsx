'use client';

import { useMemo } from 'react';
import { TripDiscoverSearchBar } from '@/components/dashboard/TripDiscoverSearchBar';
import type { TripWithRelations } from '@/types/trip';
import { Search, Plus } from 'lucide-react';
import { type Session } from 'next-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardClient({
  initialTrips,
  session,
}: {
  initialTrips: TripWithRelations[];
  session: Session | null;
}) {
  const priceBounds = useMemo(() => {
    const prices = initialTrips.map((t) => Number(t.price) || 0).filter((p) => p >= 0);
    const dataMax = prices.length ? Math.max(...prices) : 500;
    const max = Math.max(500, Math.ceil(dataMax / 50) * 50);
    return { min: 0, max };
  }, [initialTrips]);

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

      <div className="mt-14 max-w-2xl mx-auto text-center py-12 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-5">
          <Search className="h-7 w-7 text-accent" />
        </div>
        <h3 className="font-display text-xl text-white font-semibold">Imposta i filtri e cerca</h3>
        <p className="mt-2 text-white/60 text-sm">
          I risultati compariranno in una pagina dedicata con tutti i viaggi a cui puoi unirti.
        </p>
      </div>
    </div>
  );
}