'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Hotel, Loader2, Plane, Search } from 'lucide-react';
import type { ComposerDraft } from '@/types/composer';

type TravelSearchPanelProps = {
  draft: ComposerDraft;
  onAddFlight: () => void;
  onAddHotel: () => void;
};

export function TravelSearchPanel({ draft, onAddFlight, onAddHotel }: TravelSearchPanelProps) {
  const [loading, setLoading] = useState(true);
  const [flightUrl, setFlightUrl] = useState<string | null>(null);
  const [hotelUrl, setHotelUrl] = useState<string | null>(null);
  const [flightPrice, setFlightPrice] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      destination: draft.destination,
      startDate: draft.startDate,
      endDate: draft.endDate,
    });

    setLoading(true);
    Promise.all([
      fetch(`/api/travel/links?${params}`).then((r) => r.json()),
      fetch(`/api/travel/estimate?${params}`).then((r) => r.json()),
    ])
      .then(([links, estimate]) => {
        setFlightUrl(links.flightUrl ?? null);
        setHotelUrl(links.hotelUrl ?? null);
        if (estimate.found && estimate.quote?.price) {
          setFlightPrice(estimate.quote.price);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [draft.destination, draft.startDate, draft.endDate]);

  const dest = draft.destinationMeta?.label ?? draft.destination;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 px-1">
        Cerca &amp; prenota
      </p>

      <div className="composer-travel-card rounded-2xl overflow-hidden border border-sky-400/20">
        <div className="bg-gradient-to-r from-sky-600/40 to-blue-700/20 px-4 py-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/30">
            <Plane className="h-5 w-5 text-sky-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50">Voli · Skyscanner style</p>
            <p className="font-semibold text-white text-sm truncate">ROM → {dest}</p>
            <p className="text-[10px] text-white/40">
              {draft.startDate} → {draft.endDate}
            </p>
          </div>
          {flightPrice != null && (
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-white tabular-nums">{flightPrice}€</p>
              <p className="text-[9px] text-sky-200/60">da cache</p>
            </div>
          )}
        </div>
        <div className="p-3 flex gap-2 bg-white/[0.02]">
          <Button
            type="button"
            size="sm"
            className="flex-1 rounded-xl h-9 text-xs bg-sky-600 hover:bg-sky-500"
            onClick={onAddFlight}
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Aggiungi al piano
          </Button>
          {flightUrl && (
            <Button asChild size="sm" variant="outline" className="rounded-xl h-9 text-xs border-sky-400/30 text-sky-200 hover:bg-sky-500/10">
              <a href={flightUrl} target="_blank" rel="noopener noreferrer sponsored">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="composer-travel-card rounded-2xl overflow-hidden border border-violet-400/20">
        <div className="bg-gradient-to-r from-violet-600/40 to-purple-700/20 px-4 py-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/30">
            <Hotel className="h-5 w-5 text-violet-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50">Hotel · Booking style</p>
            <p className="font-semibold text-white text-sm truncate">{dest}</p>
            <p className="text-[10px] text-white/40">
              Check-in {draft.startDate} · Check-out {draft.endDate}
            </p>
          </div>
        </div>
        <div className="p-3 flex gap-2 bg-white/[0.02]">
          <Button
            type="button"
            size="sm"
            className="flex-1 rounded-xl h-9 text-xs bg-violet-600 hover:bg-violet-500"
            onClick={onAddHotel}
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Aggiungi al piano
          </Button>
          {hotelUrl && (
            <Button asChild size="sm" variant="outline" className="rounded-xl h-9 text-xs border-violet-400/30 text-violet-200 hover:bg-violet-500/10">
              <a href={hotelUrl} target="_blank" rel="noopener noreferrer sponsored">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <p className="text-[10px] text-white/30 text-center flex items-center justify-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Caricamento prezzi...
        </p>
      )}
    </div>
  );
}