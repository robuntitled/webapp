'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plane, RefreshCw } from 'lucide-react';

type FlightPriceEstimateProps = {
  destination: string;
  startDate?: Date;
  endDate?: Date;
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
    expiresAt: string | null;
  };
  message?: string;
  disclaimer?: string;
  error?: string;
};

export function FlightPriceEstimate({
  destination,
  startDate,
  endDate,
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

      const response = await fetch(`/api/travel/estimate?${params.toString()}`);
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
  }, [destination, startDate?.toISOString(), endDate?.toISOString()]);

  if (!canEstimate) return null;

  if (state === 'unconfigured') {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
        Per stimare il prezzo volo via API aggiungi{' '}
        <code className="text-[11px]">TRAVELPAYOUTS_API_TOKEN</code> in `.env.local` (token da{' '}
        <a
          href="https://www.travelpayouts.com/developers/api"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Travelpayouts → API
        </a>
        ). Non serve un dominio.
      </p>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border p-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Sto cercando il volo più economico in cache...
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-sm text-destructive rounded-lg border border-destructive/30 p-3 space-y-2">
        <p>{data?.error ?? 'Errore durante la stima prezzo'}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadEstimate()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Riprova
        </Button>
      </div>
    );
  }

  if (state === 'ready' && data?.found && data.quote) {
    const { quote, disclaimer } = data;
    return (
      <div className="rounded-lg border bg-primary/5 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Plane className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Volo indicativo: {quote.price} {quote.currency}
              </p>
              <p className="text-xs text-muted-foreground">
                {quote.origin} → {quote.destination}
                {quote.airline ? ` · ${quote.airline}` : ''}
              </p>
            </div>
          </div>
          {onSuggestPrice && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onSuggestPrice(Math.round(quote.price))}
            >
              Usa come prezzo base
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{disclaimer}</p>
      </div>
    );
  }

  if (state === 'ready' && !data?.found) {
    return (
      <p className="text-xs text-muted-foreground rounded-lg border p-3">
        {data?.message ?? 'Nessuna stima disponibile per questa rotta.'}
      </p>
    );
  }

  return null;
}