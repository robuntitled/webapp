import Link from 'next/link';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { AffiliateSearchCard } from '@/components/travel/AffiliateSearchCard';
import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import { Button } from '@/components/ui/button';
import { buildTripHotelSearchUrl } from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { ArrowLeft } from 'lucide-react';

export default function PrenotaHotelPage() {
  const config = getTravelpayoutsConfig();
  const start = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 37 * 86400000).toISOString().slice(0, 10);
  const hotelUrl = buildTripHotelSearchUrl(undefined, {
    destination: 'Barcellona',
    startDate: start,
    endDate: end,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-semibold">Cerca hotel</h1>
        <p className="text-muted-foreground mt-1">
          Partner Travelpayouts / Booking.com — link affiliate con tracciamento NomadLink.
        </p>
      </div>

      {!config.isConfigured && <TravelpayoutsSetupNotice />}

      {config.isConfigured && (
        <AffiliateSearchCard
          flightUrl={null}
          hotelUrl={hotelUrl}
          destination="Barcellona"
          title="Motore hotel affiliate"
        />
      )}

      {config.isConfigured && <AffiliateDisclosure />}
    </div>
  );
}