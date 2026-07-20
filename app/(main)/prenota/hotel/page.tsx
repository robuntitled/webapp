import Link from 'next/link';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { AffiliateSearchCard } from '@/components/travel/AffiliateSearchCard';
import { LiteApiHotelSearch } from '@/components/travel/LiteApiHotelSearch';
import { TravelpayoutsSetupNotice } from '@/components/travel/TravelpayoutsSetupNotice';
import { Button } from '@/components/ui/button';
import { buildTripHotelSearchUrl } from '@/lib/travelpayouts/flight-search';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { ArrowLeft } from 'lucide-react';

export default function PrenotaHotelPage() {
  const liteOk = isLiteApiConfigured();
  const config = getTravelpayoutsConfig();
  const start = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const end = new Date(Date.now() + 37 * 86400000).toISOString().slice(0, 10);
  const hotelUrl = buildTripHotelSearchUrl(undefined, {
    destination: 'Barcellona',
    startDate: start,
    endDate: end,
  });

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <h1 className="font-display text-3xl font-semibold">Cerca hotel</h1>
        <p className="mt-1 text-muted-foreground">
          {liteOk
            ? 'Ricerca e tariffe in-app via LiteAPI (commissione su prenotazione).'
            : 'Configura LITEAPI_KEY per la ricerca in-app, oppure usa il fallback affiliate.'}
        </p>
      </div>

      {liteOk ? (
        <LiteApiHotelSearch defaultCity="Roma" defaultCountry="IT" />
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Aggiungi <code className="text-xs">LITEAPI_KEY</code> (sandbox da{' '}
          <a
            href="https://dashboard.liteapi.travel/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            dashboard.liteapi.travel
          </a>
          ) in <code className="text-xs">.env.local</code> e su Vercel.
        </div>
      )}

      {!config.isConfigured && !liteOk && <TravelpayoutsSetupNotice />}

      {config.isConfigured && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">
            {liteOk ? 'Fallback affiliate' : 'Motore affiliate'}
          </h2>
          <AffiliateSearchCard
            flightUrl={null}
            hotelUrl={hotelUrl}
            destination="Barcellona"
            title="Travelpayouts / Booking.com"
          />
          <AffiliateDisclosure />
        </div>
      )}
    </div>
  );
}
