'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import {
  AlertCircle,
  Car,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { AirportPlaceInput } from '@/components/travel/AirportPlaceInput';
import { FlightDateField } from '@/components/travel/FlightDateField';
import { GuestsPicker } from '@/components/travel/GuestsPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildGetTransferAffiliateHandoff } from '@/lib/gettransfer/affiliate-url';
import { isGetTransferAffiliateConfigured } from '@/lib/gettransfer/config';
import {
  resolvePlaceExact,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
import {
  loadSearchFormCache,
  saveSearchFormCache,
} from '@/lib/travel/search-form-cache';
import { cn } from '@/lib/utils';

type FormCache = {
  from: string;
  to: string;
  pickupDate: string;
  pickupTime: string;
  adults: number;
  children: number;
};

type TransferOfferHit = {
  transportType: string;
  labelIt: string;
  priceLabel: string;
  priceFloat: number;
  bookNow?: string;
  duration?: number;
  distance?: number;
};

type QuotesResponse = {
  offers?: TransferOfferHit[];
  from?: { label: string; lat: number; lng: number };
  to?: { label: string; lat: number; lng: number };
  distance?: number;
  duration?: number;
  success?: boolean;
  error?: string;
  code?: string;
  configured?: boolean;
  sandbox?: boolean;
  hint?: string;
};

const DEFAULT_TIME = '10:00';
/** GetTransfer requires the pickup to be at least 24h ahead. */
const MIN_HOURS_AHEAD = 24;

function pickupTimestamp(date: string, time: string): number {
  return new Date(`${date}T${time}:00`).getTime();
}

function isTooSoon(date: string, time: string): boolean {
  const ts = pickupTimestamp(date, time);
  if (Number.isNaN(ts)) return false;
  return ts < Date.now() + MIN_HOURS_AHEAD * 60 * 60 * 1000;
}

/** First day where the default pickup time still clears the 24h minimum. */
function defaultPickupDate(): string {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  if (!isTooSoon(tomorrow, DEFAULT_TIME)) return tomorrow;
  return format(addDays(new Date(), 2), 'yyyy-MM-dd');
}

function formatDuration(mins: number | undefined): string | null {
  if (mins == null || mins <= 0) return null;
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatDistance(km: number | undefined): string | null {
  if (km == null || km <= 0) return null;
  return `${Math.round(km)} km`;
}

function TransferOfferCard({
  offer,
  onBook,
}: {
  offer: TransferOfferHit;
  onBook: () => void;
}) {
  const duration = formatDuration(offer.duration);
  const distance = formatDistance(offer.distance);
  const instant = Boolean(offer.bookNow);

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
      <div className="grid sm:grid-cols-[120px_1fr]">
        <div className="relative flex min-h-[120px] items-center justify-center bg-muted/60 sm:min-h-[148px]">
          <Car className="h-10 w-10 text-muted-foreground/40 transition group-hover:text-primary/50" />
          {instant ? (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-emerald-950/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100 backdrop-blur-sm">
              Prenota ora
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3 p-3.5 sm:p-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {duration ? (
                <span className="inline-flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {duration}
                </span>
              ) : null}
              {duration && distance ? <span aria-hidden>·</span> : null}
              {distance ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {distance}
                </span>
              ) : null}
            </div>
            <h3 className="font-display text-[15px] font-semibold leading-snug tracking-tight text-foreground sm:text-base">
              {offer.labelIt}
            </h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Prezzo fisso · autista privato
            </p>
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-border/40 pt-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {offer.priceLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Pagamento su GetTransfer
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-xl px-3 font-semibold"
              onClick={onBook}
            >
              Continua prenotazione
              <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-90" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PrenotaTransferClient() {
  const [cacheReady, setCacheReady] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromPlace, setFromPlace] = useState<PlaceSuggestion | null>(null);
  const [toPlace, setToPlace] = useState<PlaceSuggestion | null>(null);
  const [pickupDate, setPickupDate] = useState(defaultPickupDate);
  const [pickupTime, setPickupTime] = useState(DEFAULT_TIME);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<TransferOfferHit[] | null>(null);
  const [routeMeta, setRouteMeta] = useState<{
    from?: string;
    to?: string;
    distance?: number;
    duration?: number;
  } | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [noOffersHint, setNoOffersHint] = useState<string | null>(null);

  const affiliateReady = isGetTransferAffiliateConfigured();
  const pax = adults + children;

  useEffect(() => {
    const cached = loadSearchFormCache<FormCache>('transfer');
    if (cached) {
      setFrom(cached.from ?? '');
      setTo(cached.to ?? '');
      const cachedTime = cached.pickupTime || DEFAULT_TIME;
      if (cached.pickupTime) setPickupTime(cachedTime);
      if (cached.pickupDate && !isTooSoon(cached.pickupDate, cachedTime)) {
        setPickupDate(cached.pickupDate);
      }
      if (cached.adults) setAdults(cached.adults);
      setChildren(cached.children ?? 0);
      setFromPlace(cached.from ? resolvePlaceExact(cached.from) : null);
      setToPlace(cached.to ? resolvePlaceExact(cached.to) : null);
    }
    setCacheReady(true);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    const payload: FormCache = {
      from,
      to,
      pickupDate,
      pickupTime,
      adults,
      children,
    };
    saveSearchFormCache('transfer', payload);
    const onHide = () => saveSearchFormCache('transfer', payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheReady, from, to, pickupDate, pickupTime, adults, children]);

  const openAffiliateHandoff = () => {
    const fromLabel = from.trim();
    const toLabel = to.trim();
    const { url, hasAffiliateTracking } = buildGetTransferAffiliateHandoff({
      from: fromLabel,
      to: toLabel,
      pickupDate,
      pickupTime,
      adults,
      children,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!hasAffiliateTracking) {
      toast.message('Apertura GetTransfer', {
        description:
          'Tracking affiliate non attivo: configura NEXT_PUBLIC_TRAVELPAYOUTS_MARKER in .env.local.',
      });
    }
  };

  const handleSearch = async () => {
    const fromLabel = from.trim();
    const toLabel = to.trim();
    if (!fromLabel || !toLabel) {
      toast.error('Inserisci partenza e destinazione.');
      return;
    }
    if (fromLabel.toLowerCase() === toLabel.toLowerCase()) {
      toast.error('Partenza e destinazione devono essere diverse.');
      return;
    }
    if (isTooSoon(pickupDate, pickupTime)) {
      toast.error(
        `Il transfer deve essere prenotato con almeno ${MIN_HOURS_AHEAD} ore di anticipo.`
      );
      return;
    }

    setLoading(true);
    setOffers(null);
    setRouteMeta(null);
    setApiUnavailable(false);
    setNoOffersHint(null);

    try {
      const res = await fetch('/api/gettransfer/quotes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLabel,
          toLabel,
          date: pickupDate,
          time: pickupTime,
          pax,
          fromCountry: fromPlace?.countryCode,
          toCountry: toPlace?.countryCode,
        }),
      });

      const data = (await res.json()) as QuotesResponse;

      if (res.status === 503 && data.code === 'missing_token') {
        setApiUnavailable(true);
        toast.message('API GetTransfer non attiva', {
          description: 'Usa il fallback su GetTransfer o richiedi il token a Travelpayouts.',
          duration: 8000,
        });
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita', { duration: 8000 });
        return;
      }

      const list = data.offers ?? [];
      setOffers(list);
      setRouteMeta({
        from: data.from?.label ?? fromLabel,
        to: data.to?.label ?? toLabel,
        distance: data.distance,
        duration: data.duration,
      });

      setNoOffersHint(list.length ? null : (data.hint ?? null));

      if (!list.length) {
        toast.message('Nessuna offerta per questo tragitto', {
          description:
            data.hint ??
            'Prova date diverse o apri GetTransfer per richiedere un preventivo.',
          duration: data.hint ? 8000 : undefined,
        });
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const routeSummary = useMemo(() => {
    if (!routeMeta) return null;
    const parts = [
      routeMeta.from && routeMeta.to ? `${routeMeta.from} → ${routeMeta.to}` : null,
      formatDistance(routeMeta.distance),
      formatDuration(routeMeta.duration),
    ].filter(Boolean);
    return parts.join(' · ');
  }, [routeMeta]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-px shadow-lg shadow-primary/10">
        <div className="rounded-[0.95rem] bg-card px-3 py-3 sm:px-3.5 sm:py-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.7fr_1fr_auto] lg:items-end">
            <AirportPlaceInput
              label="Partenza"
              value={from}
              selected={fromPlace}
              onValueChange={(v) => {
                setFrom(v);
                setFromPlace(null);
              }}
              onClearSelection={() => setFromPlace(null)}
              onSelect={(place) => {
                setFromPlace(place);
                setFrom(place.label);
              }}
              placeholder="Aeroporto, hotel, indirizzo…"
              kinds={['city', 'airport', 'country']}
              showAirportCode
              placesFallback
            />
            <AirportPlaceInput
              label="Destinazione"
              value={to}
              selected={toPlace}
              onValueChange={(v) => {
                setTo(v);
                setToPlace(null);
              }}
              onClearSelection={() => setToPlace(null)}
              onSelect={(place) => {
                setToPlace(place);
                setTo(place.label);
              }}
              placeholder="Aeroporto, hotel, indirizzo…"
              kinds={['city', 'airport', 'country']}
              showAirportCode
              placesFallback
            />
            <FlightDateField
              tripType="oneway"
              startDate={pickupDate}
              endDate={pickupDate}
              onStartDateChange={setPickupDate}
              onEndDateChange={setPickupDate}
            />
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ora
              </p>
              <Input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="h-12 rounded-xl border-border/80 bg-background px-3 text-sm"
              />
            </div>
            <GuestsPicker
              adults={adults}
              childrenCount={children}
              onAdultsChange={setAdults}
              onChildrenChange={setChildren}
              label="Passeggeri"
              maxAdults={8}
              maxChildren={6}
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="h-12 w-full rounded-xl px-5 font-semibold lg:w-auto"
                onClick={() => void handleSearch()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Cerca transfer
              </Button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/40 pt-2.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Partner: <span className="text-foreground">GetTransfer</span>
              {!affiliateReady ? (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                  (marker non configurato)
                </span>
              ) : null}
            </p>
            <p className="ml-auto text-[11px] text-muted-foreground">
              Ricerca su NomadLink · pagamento GetTransfer
            </p>
          </div>
        </div>
      </div>

      {apiUnavailable ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                API GetTransfer non configurata
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                <li>
                  Scrivi a{' '}
                  <a
                    href="mailto:support@travelpayouts.com?subject=GetTransfer%20API%20access%20token"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    support@travelpayouts.com
                  </a>{' '}
                  per ottenere il token X-ACCESS-TOKEN
                </li>
                <li>
                  Aggiungi <code className="text-xs">GETTRANSFER_ACCESS_TOKEN</code> in
                  .env.local (solo server)
                </li>
                <li>
                  Per test usa <code className="text-xs">GETTRANSFER_ENV=sandbox</code>{' '}
                  (gtrbox.org)
                </li>
              </ol>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 rounded-lg"
                onClick={openAffiliateHandoff}
              >
                Apri GetTransfer
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {loading && !offers ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Ricerca transfer in corso…
        </div>
      ) : null}

      {offers && offers.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{offers.length}</span>{' '}
              {offers.length === 1 ? 'classe disponibile' : 'classi disponibili'}
              {routeSummary ? (
                <span className="ml-1 hidden sm:inline">· {routeSummary}</span>
              ) : null}
            </p>
          </div>
          <div className={cn('grid gap-3', 'sm:grid-cols-1 lg:grid-cols-2')}>
            {offers.map((offer) => (
              <TransferOfferCard
                key={offer.transportType}
                offer={offer}
                onBook={openAffiliateHandoff}
              />
            ))}
          </div>
        </div>
      ) : null}

      {offers && offers.length === 0 && !loading ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Nessuna tariffa disponibile per questo tragitto.</p>
          {noOffersHint ? (
            <p className="mt-1.5 text-[13px] text-amber-600 dark:text-amber-400">
              {noOffersHint}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 rounded-lg"
            onClick={openAffiliateHandoff}
          >
            Richiedi preventivo su GetTransfer
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <p>
          Confronti prezzi e classi veicolo su NomadLink. La prenotazione e il pagamento si
          completano su{' '}
          <span className="font-medium text-foreground">GetTransfer</span> in una nuova
          scheda
          <ExternalLink className="ml-0.5 inline h-3.5 w-3.5 align-text-bottom opacity-70" />
          .
        </p>
      </div>
    </div>
  );
}
