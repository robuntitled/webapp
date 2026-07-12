import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { BedDouble, ExternalLink, Plane } from 'lucide-react';

type AffiliateSearchCardProps = {
  flightUrl: string | null;
  hotelUrl: string | null;
  destination?: string;
  title?: string;
  prenotaPath?: string;
};

export function AffiliateSearchCard({
  flightUrl,
  hotelUrl,
  destination,
  title = 'Cerca e prenota',
  prenotaPath,
}: AffiliateSearchCardProps) {
  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {destination
              ? `Voli e hotel per ${destination} via Travelpayouts (Aviasales / Booking.com).`
              : 'Motori affiliate Travelpayouts — ogni prenotazione supporta NomadLink.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {flightUrl ? (
            <Button asChild className="w-full justify-between">
              <a href={flightUrl} target="_blank" rel="noopener noreferrer sponsored">
                <span className="inline-flex items-center">
                  <Plane className="mr-2 h-4 w-4" />
                  Cerca voli
                </span>
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            </Button>
          ) : (
            <p className="text-xs text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              Voli: verifica destinazione e date, oppure aggiungi{' '}
              <code className="text-[10px]">NEXT_PUBLIC_TRAVELPAYOUTS_MARKER</code> su Vercel.
            </p>
          )}

          {hotelUrl ? (
            <Button asChild variant="outline" className="w-full justify-between">
              <a href={hotelUrl} target="_blank" rel="noopener noreferrer sponsored">
                <span className="inline-flex items-center">
                  <BedDouble className="mr-2 h-4 w-4" />
                  Cerca hotel
                </span>
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Hotel: link non disponibile per questa meta.</p>
          )}

          {prenotaPath && (
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href={prenotaPath}>Hub prenotazioni del viaggio</Link>
            </Button>
          )}
        </div>

        <AffiliateDisclosure />
      </CardContent>
    </Card>
  );
}