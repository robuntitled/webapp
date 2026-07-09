import Link from 'next/link';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { AffiliateSearchCard } from '@/components/travel/AffiliateSearchCard';
import { TravelpayoutsFlightWidget } from '@/components/travel/TravelpayoutsFlightWidget';
import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildTripFlightSearchUrl } from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { ArrowLeft } from 'lucide-react';

export default function PrenotaVoliPage() {
  const config = getTravelpayoutsConfig();
  const flightUrl = config.marker
    ? buildTripFlightSearchUrl({
        destination: 'Barcellona',
        startDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 37 * 86400000).toISOString().slice(0, 10),
        subId: 'prenota_voli',
      })
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-semibold">Cerca voli</h1>
        <p className="text-muted-foreground mt-1">
          Partner Travelpayouts / Aviasales — link affiliate con tracciamento NomadLink.
        </p>
      </div>

      {!config.isConfigured && <TravelpayoutsSetupNotice />}

      {config.mode === 'affiliate' && (
        <AffiliateSearchCard flightUrl={flightUrl} hotelUrl={null} title="Motore voli affiliate" />
      )}

      {config.mode === 'subdomain' && flightUrl && (
        <AffiliateSearchCard flightUrl={flightUrl} hotelUrl={null} title="Motore voli White Label" />
      )}

      {config.mode === 'widget' && config.wlId && (
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-6">
            <TravelpayoutsFlightWidget
              wlId={config.wlId}
              resultsPath="/prenota/voli"
              showSearch
              showResults
            />
          </CardContent>
        </Card>
      )}

      {config.isConfigured && <AffiliateDisclosure />}
    </div>
  );
}