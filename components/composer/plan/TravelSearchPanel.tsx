'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ComposerFlightWidget } from '@/components/composer/plan/ComposerFlightWidget';
import { TravelAffiliateSetupBanner } from '@/components/travel/TravelAffiliateSetupBanner';
import { collectOriginsFromDraft, uniqueOriginsByIata } from '@/lib/composer/origins';
import { defaultOriginIata } from '@/lib/travelpayouts/origin-iata';
import { hasEmbeddedTravelWidget } from '@/lib/travelpayouts/public-config';
import type { TravelSetupStatus } from '@/lib/travelpayouts/setup-hints';
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
  const widgetEnabled = hasEmbeddedTravelWidget();
  const [loading, setLoading] = useState(!widgetEnabled);
  const [hotelUrl, setHotelUrl] = useState<string | null>(null);
  const [originFlights, setOriginFlights] = useState<OriginFlightState[]>([]);
  const [setup, setSetup] = useState<TravelSetupStatus | null>(null);
  const [linkWarnings, setLinkWarnings] = useState<string[]>([]);
  const [showAffiliateExtras, setShowAffiliateExtras] = useState(!widgetEnabled);

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
  const dest = draft.destinationMeta?.label ?? draft.destination;
  const crewOrigins = origins.filter((o) => o.role === 'crew');

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
        widgetEnabled
          ? Promise.resolve({ found: false })
          : fetch(
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
        setSetup(hotelLinks.setup ?? null);
        setLinkWarnings(hotelLinks.warnings ?? []);
        setOriginFlights(flights);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [draft.destination, draft.startDate, draft.endDate, originsKey, widgetEnabled]);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 px-1">
        Cerca &amp; prenota
      </p>

      <TravelAffiliateSetupBanner setup={setup} compact />

      {!widgetEnabled && (
        <p className="text-[10px] text-white/40 px-1 leading-relaxed">
          Per il motore di ricerca integrato (prezzi live, senza cache): aggiungi{' '}
          <code className="text-[9px] text-accent/80">NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID</code> su
          Vercel — WL Web → Widget → copia wl_id dalla tab &quot;Your widget code&quot;.
        </p>
      )}

      {widgetEnabled && <ComposerFlightWidget draft={draft} />}

      {widgetEnabled && (
        <div className="flex flex-wrap gap-2 px-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-[10px] border-white/10 text-white/70"
            onClick={() => onAddFlight(draft.organizerOrigin ?? origins[0])}
          >
            <Search className="mr-1 h-3 w-3" />
            Aggiungi volo al piano
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-[10px] text-white/45"
            onClick={() => setShowAffiliateExtras((v) => !v)}
          >
            {showAffiliateExtras ? 'Nascondi link esterni' : 'Link esterni / amici'}
          </Button>
        </div>
      )}

      {linkWarnings.map((warning) => (
        <p key={warning} className="text-[10px] text-amber-200/80 px-1 leading-relaxed">
          ⚠ {warning}
        </p>
      ))}

      {(showAffiliateExtras || !widgetEnabled) &&
        originFlights.map((item) => {
          if (widgetEnabled && item.origin.role === 'organizer') return null;

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
                {!widgetEnabled && item.price != null && (
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

      {widgetEnabled && crewOrigins.length > 0 && !showAffiliateExtras && (
        <p className="text-[10px] text-white/35 px-1">
          {crewOrigins.length} amico/i da altre città — apri &quot;Link esterni / amici&quot; per le
          loro rotte.
        </p>
      )}

      <div className="composer-travel-card rounded-2xl overflow-hidden border border-violet-400/20">
        <div className="bg-gradient-to-r from-violet-600/40 to-purple-700/20 px-4 py-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/30">
            <Hotel className="h-5 w-5 text-violet-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50">Hotel · Booking.com</p>
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

      {loading && !widgetEnabled && (
        <p className="text-[10px] text-white/30 text-center flex items-center justify-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Caricamento prezzi...
        </p>
      )}
    </div>
  );
}