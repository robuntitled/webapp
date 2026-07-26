'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plane, RefreshCw } from 'lucide-react';

type FlightPriceEstimateProps = {
  destination: string;
  startDate?: Date;
  endDate?: Date;
  originIata?: string;
  onSuggestPrice?: (price: number) => void;
};

type EstimateResponse = {
  configured?: boolean;
  found?: boolean;
  quote?: {
    price: number;
    currency: string;
    airline: string | null;
    origin: string;
    destination: string;
    offerId?: string;
  };
  message?: string;
  error?: string;
};

export function FlightPriceEstimate({
  destination,
  startDate,
  endDate,
  originIata,
  onSuggestPrice,
}: FlightPriceEstimateProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unconfigured' | 'error'>('idle');
  const [data, setData] = useState<EstimateResponse | null>(null);

  const canEstimate = Boolean(destination.trim() && startDate && endDate);

  const loadEstimate = async () => {
    if (!canEstimate || !startDate || !endDate) return;

    setState('loading');
    try {
      const params = new URLSearchParams({
        destination,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      });
      if (originIata) params.set('originIata', originIata);

      const response = await fetch(`/api/liteapi/flights/search?${params.toString()}`);
      const json = (await response.json()) as EstimateResponse;

      if (response.status === 503) {
        setState('unconfigured');
        setData(json);
        return;
      }

      if (!response.ok) {
        setState('error');
        setData(json);
        return;
      }

      setData(json);
      setState('ready');
      if (json.found && json.quote?.price && onSuggestPrice) {
        onSuggestPrice(json.quote.price);
      }
    } catch {
      setState('error');
      setData({ configured: true, error: 'Impossibile recuperare la stima prezzo' });
    }
  };

  useEffect(() => {
    if (!canEstimate) {
      setState('idle');
      setData(null);
      return;
    }

    const timer = setTimeout(() => {
      void loadEstimate();
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, startDate?.toISOString(), endDate?.toISOString(), originIata]);

  if (!canEstimate) return null;

  if (state === 'unconfigured') {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
        Per stimare i voli configura la chiave API voli in `.env.local` / Vercel.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Plane className="h-3.5 w-3.5" />
          Stima volo
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => void loadEstimate()}
          disabled={state === 'loading'}
        >
          {state === 'loading' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {state === 'loading' && (
        <p className="text-xs text-muted-foreground">Ricerca tariffe…</p>
      )}

      {state === 'ready' && data?.found && data.quote && (
        <p className="text-sm">
          da{' '}
          <span className="font-semibold">
            {data.quote.price.toLocaleString('it-IT')} {data.quote.currency}
          </span>
          <span className="text-xs text-muted-foreground">
            {' '}
            · {data.quote.origin} → {data.quote.destination}
            {data.quote.airline ? ` · ${data.quote.airline}` : ''}
          </span>
        </p>
      )}

      {state === 'ready' && !data?.found && (
        <p className="text-xs text-muted-foreground">
          {data?.message ?? 'Nessuna tariffa trovata per queste date.'}
        </p>
      )}

      {state === 'error' && (
        <p className="text-xs text-destructive">
          {data?.error ?? 'Errore ricerca voli'}
        </p>
      )}
    </div>
  );
}
