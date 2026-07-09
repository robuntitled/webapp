import Link from 'next/link';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { TravelpayoutsFlightWidget } from '@/components/travel/TravelpayoutsFlightWidget';
import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildWhiteLabelUrl } from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function PrenotaVoliPage() {
  const config = getTravelpayoutsConfig();
  const subdomainUrl =
    config.flightsDomain && config.marker
      ? buildWhiteLabelUrl({
          domain: config.flightsDomain,
          marker: config.marker,
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
          Motore di ricerca NomadLink — powered by Travelpayouts White Label.
        </p>
      </div>

      {!config.isConfigured && <TravelpayoutsSetupNotice />}

      {config.mode === 'subdomain' && subdomainUrl && (
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              La ricerca voli è ospitata su{' '}
              <strong className="text-foreground">{config.flightsDomain}</strong> con il tuo
              brand.
            </p>
            <Button asChild size="lg">
              <a href={subdomainUrl} target="_blank" rel="noopener noreferrer">
                Apri motore voli
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
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