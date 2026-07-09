import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import {
  buildTripFlightSearchUrl,
  buildTripHotelSearchUrl,
} from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { formatTripDate } from '@/lib/utils/trip';
import { BedDouble, ExternalLink, Plane } from 'lucide-react';

type TripBookingSectionProps = {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
};

export function TripBookingSection({
  tripId,
  destination,
  startDate,
  endDate,
  maxParticipants,
}: TripBookingSectionProps) {
  const config = getTravelpayoutsConfig();
  const flightUrl = buildTripFlightSearchUrl({
    tripId,
    destination,
    startDate,
    endDate,
    adults: Math.min(maxParticipants, 9),
  });
  const hotelUrl = buildTripHotelSearchUrl(tripId);
  const prenotaPath = `/viaggi/${tripId}/prenota`;

  const canSearch = config.mode === 'subdomain' || config.mode === 'widget';

  if (!canSearch) {
    return <TravelpayoutsSetupNotice />;
  }

  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Organizza il viaggio</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cerca voli e hotel per {destination} ({formatTripDate(startDate)} –{' '}
            {formatTripDate(endDate)}) sul motore NomadLink — resti nel nostro ecosistema fino al
            pagamento.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {config.mode === 'subdomain' && flightUrl ? (
            <Button asChild className="w-full justify-between">
              <a href={flightUrl} target="_blank" rel="noopener noreferrer">
                <span className="inline-flex items-center">
                  <Plane className="mr-2 h-4 w-4" />
                  Cerca voli
                </span>
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href={`${prenotaPath}?tipo=voli`}>
                <Plane className="mr-2 h-4 w-4" />
                Cerca voli
              </Link>
            </Button>
          )}

          {config.mode === 'subdomain' && hotelUrl ? (
            <Button asChild variant="outline" className="w-full justify-between">
              <a href={hotelUrl} target="_blank" rel="noopener noreferrer">
                <span className="inline-flex items-center">
                  <BedDouble className="mr-2 h-4 w-4" />
                  Cerca hotel
                </span>
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link href={`${prenotaPath}?tipo=hotel`}>
                <BedDouble className="mr-2 h-4 w-4" />
                Cerca hotel
              </Link>
            </Button>
          )}

          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href={prenotaPath}>Apri hub prenotazioni del viaggio</Link>
          </Button>
        </div>

        <AffiliateDisclosure />
      </CardContent>
    </Card>
  );
}