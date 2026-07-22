'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plane, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type FlightOffer = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
};

type TripFlightBookSearchProps = {
  destination: string;
  startDate: string;
  endDate: string;
  defaultOriginIata?: string;
  adults?: number;
};

export function TripFlightBookSearch({
  destination,
  startDate,
  endDate,
  defaultOriginIata = 'ROM',
  adults = 1,
}: TripFlightBookSearchProps) {
  const [originIata, setOriginIata] = useState(defaultOriginIata);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<FlightOffer[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        destination,
        startDate,
        endDate,
        originIata: originIata.trim().toUpperCase() || 'ROM',
        adults: String(adults),
        currency: 'EUR',
      });
      const res = await fetch(`/api/liteapi/flights/search?${params}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as {
        offers?: FlightOffer[];
        quote?: FlightOffer | null;
        message?: string;
        error?: string;
        found?: boolean;
      };

      if (res.status === 401) {
        toast.error('Accedi per cercare voli');
        setOffers(null);
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca voli fallita', { duration: 7000 });
        setOffers(null);
        return;
      }

      const list = data.offers ?? (data.quote ? [data.quote] : []);
      setOffers(list);
      setMessage(list.length ? null : data.message ?? 'Nessuna tariffa trovata');
      if (list.length) toast.success(`${list.length} offerte LiteAPI`);
    } catch {
      toast.error('Errore di rete');
      setOffers(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, startDate, endDate, defaultOriginIata]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="min-w-0 flex-1 space-y-1 text-xs">
          <span className="text-muted-foreground">Partenza (IATA)</span>
          <Input
            value={originIata}
            onChange={(e) => setOriginIata(e.target.value.toUpperCase())}
            maxLength={3}
            className="h-10 rounded-xl uppercase"
            placeholder="ROM"
          />
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={() => void search()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {originIata || 'ROM'} → {destination} · {startDate} / {endDate}
      </p>

      {loading && !offers && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ricerca LiteAPI…
        </p>
      )}

      {message && !loading && (
        <p className="rounded-xl border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}

      {offers && offers.length > 0 && (
        <ul className="space-y-2">
          {offers.slice(0, 6).map((o) => (
            <li
              key={o.offerId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Plane className="h-3.5 w-3.5 shrink-0 text-accent" />
                  {o.origin} → {o.destination}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {o.airline ?? 'Compagnia'} · {o.offerId.slice(0, 12)}…
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-sm font-semibold tabular-nums text-primary">
                  {o.price.toLocaleString('it-IT')} {o.currency}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() =>
                    toast.message('Checkout volo in arrivo', {
                      description: 'Prebook + Stripe LiteAPI nel prossimo step.',
                    })
                  }
                >
                  Prenota
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
