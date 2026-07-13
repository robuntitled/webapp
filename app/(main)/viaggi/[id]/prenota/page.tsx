import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { AffiliateSearchCard } from '@/components/travel/AffiliateSearchCard';

import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchTripById } from '@/lib/data/trips';
import {
  buildTripFlightSearchUrl,
  buildTripHotelSearchUrl,
} from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { formatTripDate } from '@/lib/utils/trip';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
};

export default async function TripPrenotaPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { id } = await params;
  const { tipo } = await searchParams;
  const trip = await fetchTripById(id, session?.user?.id);

  if (!trip) {
    notFound();
  }

  const config = getTravelpayoutsConfig();
  const focus = tipo === 'hotel' ? 'hotel' : 'voli';
  const flightUrl = buildTripFlightSearchUrl({
    tripId: trip.id,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    adults: Math.min(trip.maxParticipants, 9),
  });
  const hotelUrl = buildTripHotelSearchUrl(trip.id, {
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-muted-foreground"
          >
            <Link href={`/viaggi/${trip.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna al viaggio
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-semibold">Prenota per {trip.title}</h1>
          <p className="text-muted-foreground mt-1">
            {trip.destination} · {formatTripDate(trip.startDate)} –{' '}
            {formatTripDate(trip.endDate)}
          </p>
        </div>
      </div>

      {!config.isConfigured && <TravelpayoutsSetupNotice />}

      {config.isConfigured && (
        <>
          {(config.mode === 'subdomain' || config.mode === 'affiliate') && (
            <AffiliateSearchCard
              flightUrl={flightUrl}
              hotelUrl={hotelUrl}
              destination={trip.destination}
              title={focus === 'hotel' ? 'Cerca hotel' : 'Cerca voli'}
            />
          )}

          {config.mode === 'widget' && config.wlId && (
            <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {focus === 'hotel' ? 'Hotel' : 'Voli'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Widget White Label integrato in NomadLink. I risultati compaiono qui sotto.
                  </p>
                </div>
                <Button asChild className="rounded-xl">
                  <Link
                    href={`/prenota/voli/ricerca?destination=${encodeURIComponent(trip.destination)}&startDate=${trip.startDate}&endDate=${trip.endDate}`}
                  >
                    Apri ricerca voli White Label
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <AffiliateDisclosure />
        </>
      )}
    </div>
  );
}