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

export const dynamic = 'force-dynamic';

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
          LiteAPI in-app · fallback Travelpayouts se serve
        </p>
      </div>

      {!liteOk && (
        <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Manca <code className="text-xs">LITEAPI_KEY</code> su Vercel (Production) → Redeploy dopo
          averla aggiunta. Chiave sandbox da{' '}
          <a
            href="https://dashboard.liteapi.travel/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            dashboard.liteapi.travel
          </a>
          .
        </div>
      )}

      {/* Form sempre visibile: la ricerca fallisce con messaggio chiaro se manca la key */}
      <LiteApiHotelSearch defaultCity="Roma" defaultCountry="IT" />

      {!config.isConfigured && !liteOk && <TravelpayoutsSetupNotice />}

      {config.isConfigured && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Fallback affiliate</h2>
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
