'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AffiliateDisclosure } from '@/components/travel/AffiliateDisclosure';
import { BedDouble, ExternalLink, Plane, RefreshCw, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

type PriceWatch = {
  watch_type: 'flight' | 'hotel';
  last_price: number | null;
  last_currency: string;
  affiliate_url: string | null;
  checked_at: string | null;
};

type PriceWatchPanelProps = {
  tripId: string;
  canManage: boolean;
  migrationReady?: boolean;
};

function formatCheckedAt(iso: string | null): string {
  if (!iso) return 'Mai aggiornato';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PriceWatchPanel({ tripId, canManage, migrationReady = true }: PriceWatchPanelProps) {
  const [watches, setWatches] = useState<PriceWatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(!migrationReady);

  const loadWatches = useCallback(async () => {
    const response = await fetch(`/api/travel/watch?tripId=${tripId}`);
    if (!response.ok) return;
    const data = (await response.json()) as { watches?: PriceWatch[] };
    setWatches(data.watches ?? []);
  }, [tripId]);

  useEffect(() => {
    void loadWatches();
  }, [loadWatches]);

  const refreshPrices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/travel/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, refresh: 'all' }),
      });
      const data = await response.json();

      if (response.status === 403) {
        toast.message('Solo chi organizza può aggiornare i prezzi — tu relax e guarda 👀');
        return;
      }

      if (!response.ok) {
        if (data.error?.includes('price_watches') || response.status === 500) {
          setNeedsMigration(true);
        }
        toast.error(data.error ?? 'Aggiornamento non riuscito');
        return;
      }

      setWatches(data.watches ?? []);
      setNeedsMigration(false);
      toast.success('Prezzi aggiornati! 🎯');
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const flight = watches.find((w) => w.watch_type === 'flight');
  const hotel = watches.find((w) => w.watch_type === 'hotel');

  if (needsMigration) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Monitoraggio prezzi disponibile dopo{' '}
          <code className="text-xs">npm run db:social</code> (migration 003).
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Radar prezzi
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tieni d&apos;occhio voli e hotel — poi prenota con un click (affiliate Travelpayouts).
            </p>
          </div>
          {canManage && (
            <Button type="button" size="sm" variant="outline" onClick={() => void refreshPrices()} disabled={loading}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Plane className="h-4 w-4 text-primary" />
              Volo (indicativo)
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {flight?.last_price != null ? `${flight.last_price} ${flight.last_currency}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">{formatCheckedAt(flight?.checked_at ?? null)}</p>
            {flight?.affiliate_url ? (
              <Button asChild size="sm" className="w-full">
                <a href={flight.affiliate_url} target="_blank" rel="noopener noreferrer">
                  Prenota volo
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/viaggi/${tripId}/prenota`}>Cerca voli</Link>
              </Button>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2 font-medium text-sm">
              <BedDouble className="h-4 w-4 text-primary" />
              Hotel
            </div>
            <p className="text-sm text-muted-foreground">
              Tariffe live sul motore partner — aggiorna e apri la ricerca brandizzata.
            </p>
            <p className="text-xs text-muted-foreground">{formatCheckedAt(hotel?.checked_at ?? null)}</p>
            {hotel?.affiliate_url ? (
              <Button asChild size="sm" variant="outline" className="w-full">
                <a href={hotel.affiliate_url} target="_blank" rel="noopener noreferrer">
                  Cerca hotel
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/prenota/hotel`}>Cerca hotel</Link>
              </Button>
            )}
          </div>
        </div>

        {!canManage && (
          <p className="text-xs text-muted-foreground text-center">
            Sei in modalità relax — l&apos;organizzatore aggiorna i prezzi per tutti 🏖️
          </p>
        )}

        <AffiliateDisclosure />
      </CardContent>
    </Card>
  );
}