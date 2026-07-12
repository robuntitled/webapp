'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { collectOriginsFromDraft, uniqueOriginsByIata } from '@/lib/composer/origins';
import { defaultOriginIata } from '@/lib/travelpayouts/origin-iata';
import type { ComposerDraft, ComposerOrigin } from '@/types/composer';
import { ExternalLink, Hotel, Loader2, Plane, Search, User, Users } from 'lucide-react';

type TravelSearchPanelProps = {
  draft: ComposerDraft;
  onAddFlight: (origin?: ComposerOrigin) => void;
  onAddHotel: () => void;
};

type OriginFlightState = {
  origin: ComposerOrigin;
  flightUrl: string | null;
  price: number | null;
};

export function TravelSearchPanel({ draft, onAddFlight, onAddHotel }: TravelSearchPanelProps) {
  const [loading, setLoading] = useState(true);
  const [hotelUrl, setHotelUrl] = useState<string | null>(null);
  const [originFlights, setOriginFlights] = useState<OriginFlightState[]>([]);

  const origins = useMemo(() => {
    const collected = collectOriginsFromDraft(draft);
    if (collected.length > 0) return uniqueOriginsByIata(collected);
    return [
      {
        id: 'default',
        label: 'Roma',
        city: 'Roma',
        iata: defaultOriginIata(),
        role: 'organizer' as const,
      },
    ];
  }, [draft.organizerOrigin, draft.crewOrigins]);

  const originsKey = origins.map((o) => `${o.id}:${o.iata}`).join('|');

  useEffect(() => {
    const baseParams = {
      destination: draft.destination,
      startDate: draft.startDate,
      endDate: draft.endDate,
    };

    setLoading(true);

    const hotelPromise = fetch(`/api/travel/links?${new URLSearchParams(baseParams)}`).then((r) =>
      r.json()
    );

    const flightPromises = origins.map((origin) =>
      Promise.all([
        fetch(
          `/api/travel/links?${new URLSearchParams({
            ...baseParams,
            origin: origin.iata,
          })}`
        ).then((r) => r.json()),
        fetch(
          `/api/travel/estimate?${new URLSearchParams({
            ...baseParams,
            origin: origin.iata,
          })}`
        ).then((r) => r.json()),
      ]).then(([links, estimate]) => ({
        origin,
        flightUrl: links.flightUrl ?? null,
        price: estimate.found && estimate.quote?.price ? estimate.quote.price : null,
      }))
    );

    Promise.all([hotelPromise, ...flightPromises])
      .then(([hotelLinks, ...flights]) => {
        setHotelUrl(hotelLinks.hotelUrl ?? null);
        setOriginFlights(flights);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [draft.destination, draft.startDate, draft.endDate, originsKey]);

  const dest = draft.destinationMeta?.label ?? draft.destination;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 px-1">
        Cerca &amp; prenota
      </p>

      {originFlights.map((item) => {
        const Icon = item.origin.role === 'organizer' ? User : Users;
        return (
          <div
            key={item.origin.id}
            className="composer-travel-card rounded-2xl overflow-hidden border border-sky-400/20"
          >
            <div className="bg-gradient-to-r from-sky-600/40 to-blue-700/20 px-4 py-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/30">
                <Plane className="h-5 w-5 text-sky-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/50 flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  {item.origin.role === 'organizer' ? 'Tu' : 'Amico'} · {item.origin.city}
                </p>
                <p className="font-semibold text-white text-sm truncate">
                  {item.origin.iata} → {dest}
                </p>
                <p className="text-[10px] text-white/40">
                  {draft.startDate} → {draft.endDate}
                </p>
              </div>
              {item.price != null && (
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-white tabular-nums">{item.price}€</p>
                  <p className="text-[9px] text-sky-200/60">da cache</p>
                </div>
              )}
            </div>
            <div className="p-3 flex gap-2 bg-white/[0.02]">
              <Button
                type="button"
                size="sm"
                className="flex-1 rounded-xl h-9 text-xs bg-sky-600 hover:bg-sky-500"
                onClick={() => onAddFlight(item.origin)}
              >
                <Search className="mr-1.5 h-3.5 w-3.5" />
                Aggiungi al piano
              </Button>
              {item.flightUrl && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-9 text-xs border-sky-400/30 text-sky-200 hover:bg-sky-500/10"
                >
                  <a href={item.flightUrl} target="_blank" rel="noopener noreferrer sponsored">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        );
      })}

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
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-xl h-9 text-xs border-violet-400/30 text-violet-200 hover:bg-violet-500/10"
            >
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