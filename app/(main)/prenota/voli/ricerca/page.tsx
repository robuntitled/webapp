'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { TravelpayoutsFlightWidget } from '@/components/travel/TravelpayoutsFlightWidget';
import { TravelpayoutsWlHotelsNotice } from '@/components/travel/TravelpayoutsWlHotelsNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  buildWlFlightSearchCodeFromParams,
  WL_FLIGHT_SEARCH_PATH,
} from '@/lib/travelpayouts/wl-search-url';
import { getPublicTravelWidgetId } from '@/lib/travelpayouts/public-config';
import { ArrowLeft, Plane } from 'lucide-react';

function RicercaVoliContent() {
  const searchParams = useSearchParams();
  const wlId = getPublicTravelWidgetId();

  const destination = searchParams.get('destination') ?? '';
  const startDate = searchParams.get('startDate') ?? '';
  const endDate = searchParams.get('endDate') ?? '';
  const originIata = (searchParams.get('origin') ?? 'ROM').toUpperCase();
  const adults = Math.min(9, Math.max(1, Number.parseInt(searchParams.get('adults') ?? '1', 10) || 1));

  const flightSearch = useMemo(() => {
    if (!destination || !startDate || !endDate) return null;
    return buildWlFlightSearchCodeFromParams({
      destination,
      startDate,
      endDate,
      originIata,
      adults,
    });
  }, [destination, startDate, endDate, originIata, adults]);

  if (!wlId) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Widget White Label non configurato. Aggiungi{' '}
          <code className="text-xs">NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID</code> su Vercel.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Plane className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-display text-lg font-semibold">Risultati voli in tempo reale</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {originIata}
              {destination ? ` → ${destination}` : ''}
              {startDate && endDate ? ` · ${startDate} → ${endDate}` : ''}
            </p>
          </div>
        </div>

        <TravelpayoutsWlHotelsNotice />

        <TravelpayoutsFlightWidget
          key={`${wlId}-${flightSearch ?? 'manual'}`}
          wlId={wlId}
          resultsPath={WL_FLIGHT_SEARCH_PATH}
          flightSearch={flightSearch}
          showSearch
          showResults
        />
      </CardContent>
    </Card>
  );
}

export default function RicercaVoliPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-semibold">Cerca voli</h1>
        <p className="text-muted-foreground mt-1">
          Pagina dedicata White Label — i risultati restano qui, senza uscire da NomadLink.
        </p>
      </div>

      <Suspense
        fallback={
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-sm text-muted-foreground">Caricamento motore voli…</CardContent>
          </Card>
        }
      >
        <RicercaVoliContent />
      </Suspense>

      <AffiliateDisclosure />
    </div>
  );
}