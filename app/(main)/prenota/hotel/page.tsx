import Link from 'next/link';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { buildTripHotelSearchUrl } from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function PrenotaHotelPage() {
  const config = getTravelpayoutsConfig();
  const hotelUrl = buildTripHotelSearchUrl();

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
          Alloggi sul motore brandizzato NomadLink — il pagamento avviene sul fornitore partner.
        </p>
      </div>

      {!config.isConfigured && <TravelpayoutsSetupNotice />}

      {config.isConfigured && hotelUrl && (
        <Card className="rounded-2xl border-0 shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Abilita la ricerca hotel nel pannello White Label (integrazione Booking.com). Il
              dominio attivo è{' '}
              <strong className="text-foreground">{config.hotelDomain}</strong>.
            </p>
            <Button asChild size="lg">
              <a href={hotelUrl} target="_blank" rel="noopener noreferrer">
                Apri ricerca hotel
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {config.isConfigured && <AffiliateDisclosure />}
    </div>
  );
}