'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowDownWideNarrow,
  ArrowRightLeft,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AirportPlaceInput } from '@/components/travel/AirportPlaceInput';
import { FlightDateField } from '@/components/travel/FlightDateField';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  placeDisplayValue,
  resolvePlaceExact,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
import { resolveFlightDestinationIata } from '@/lib/travel/iata';
import { saveFlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';
import {
  loadSearchFormCache,
  saveSearchFormCache,
  type SearchCacheKey,
} from '@/lib/travel/search-form-cache';
import { FlightOfferCard } from '@/components/travel/FlightOfferCard';
import { cn } from '@/lib/utils';

type FlightSort = 'best' | 'cheapest' | 'fastest' | 'departure';

const SORT_OPTIONS: Array<{ id: FlightSort; label: string }> = [
  { id: 'best', label: 'Il migliore' },
  { id: 'cheapest', label: 'Dal più economico' },
  { id: 'fastest', label: 'Dal più veloce' },
  { id: 'departure', label: 'Andata: orario di partenza' },
];

function departureTs(iso?: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function bestScore(o: FlightOfferView, minPrice: number, maxPrice: number): number {
  const priceNorm =
    maxPrice > minPrice ? (o.price - minPrice) / (maxPrice - minPrice) : 0;
  const duration = o.durationMinutes ?? 24 * 60;
  const durationNorm = Math.min(duration / (12 * 60), 1);
  const stopsNorm = Math.min((o.stops ?? 0) / 2, 1);
  return priceNorm * 0.5 + durationNorm * 0.35 + stopsNorm * 0.15;
}

function sortOffers(list: FlightOfferView[], sort: FlightSort): FlightOfferView[] {
  const copy = [...list];
  if (sort === 'cheapest') {
    return copy.sort((a, b) => a.price - b.price);
  }
  if (sort === 'fastest') {
    return copy.sort(
      (a, b) =>
        (a.durationMinutes ?? 99999) - (b.durationMinutes ?? 99999) ||
        a.price - b.price
    );
  }
  if (sort === 'departure') {
    return copy.sort(
      (a, b) => departureTs(a.departureAt) - departureTs(b.departureAt) || a.price - b.price
    );
  }
  // best
  const prices = copy.map((o) => o.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  return copy.sort(
    (a, b) =>
      bestScore(a, minPrice, maxPrice) - bestScore(b, minPrice, maxPrice) ||
      a.price - b.price
  );
}

export type FlightOfferView = {
  offerId: string;
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline: string | null;
  airlineCode?: string | null;
  airlineLogo?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number;
  cabinClass?: string | null;
  flightNumber?: string | null;
  returnOrigin?: string | null;
  returnDestination?: string | null;
  returnAirline?: string | null;
  returnAirlineCode?: string | null;
  returnAirlineLogo?: string | null;
  returnDepartureAt?: string | null;
  returnArrivalAt?: string | null;
  returnDurationMinutes?: number | null;
  returnStops?: number | null;
  returnFlightNumber?: string | null;
  hasReturn?: boolean;
};

function outboundKey(o: FlightOfferView): string {
  return [
    o.origin,
    o.destination,
    o.departureAt ?? '',
    o.arrivalAt ?? '',
    o.airlineCode ?? '',
    o.flightNumber ?? '',
  ].join('|');
}

type TripType = 'oneway' | 'roundtrip';

type FlightSearchPanelProps = {
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultAdults?: number;
  /** Default false: niente ricerca automatica */
  autoSearch?: boolean;
  /** Ritardo prima dell'auto-ricerca: evita chiamate LiteAPI concorrenti (mete multiple). */
  autoSearchDelayMs?: number;
  cacheKey?: SearchCacheKey | null;
  className?: string;
  defaultTripType?: TripType;
  /** composer: carta bianca sul fondo scuro del crea */
  variant?: 'default' | 'composer';
  onOriginChange?: (place: PlaceSuggestion) => void;
  /** Nasconde il form OTA: tratta e date arrivano dal viaggio */
  hideSearchForm?: boolean;
  onEditDates?: () => void;
  /** Composer: salva l'offerta senza aprire il checkout. */
  onOfferSelect?: (offer: FlightOfferView) => void;
  selectedOfferId?: string | null;
  selectLabel?: string;
};

type FlightFormCache = {
  tripType: TripType;
  originQuery: string;
  destinationQuery: string;
  originPlace: PlaceSuggestion | null;
  destinationPlace: PlaceSuggestion | null;
  startDate: string;
  endDate: string;
  adults: number;
  sort: FlightSort;
};

function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) {
    if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
    return '—';
  }
  return format(new Date(d), 'HH:mm');
}

function ensurePlace(query: string, selected: PlaceSuggestion | null): PlaceSuggestion | null {
  if (selected) return selected;
  const exact = resolvePlaceExact(query);
  if (exact) return exact;
  const iata = resolveFlightDestinationIata(query);
  if (!iata) return null;
  return {
    id: `resolved:${iata}`,
    kind: 'city',
    label: query.trim(),
    sublabel: iata,
    code: iata,
    countryCode: '',
    countryLabel: query.trim(),
  };
}

export function FlightSearchPanel({
  defaultOrigin = '',
  defaultDestination = '',
  defaultStartDate = '',
  defaultEndDate = '',
  defaultAdults = 1,
  autoSearch = false,
  autoSearchDelayMs = 0,
  cacheKey = 'flights',
  className,
  defaultTripType = 'oneway',
  variant = 'default',
  onOriginChange,
  hideSearchForm = false,
  onEditDates,
  onOfferSelect,
  selectedOfferId,
  selectLabel,
}: FlightSearchPanelProps) {
  const router = useRouter();
  const [cacheReady, setCacheReady] = useState(cacheKey == null);

  const [tripType, setTripType] = useState<TripType>(defaultTripType);
  const [originQuery, setOriginQuery] = useState(defaultOrigin);
  const [destinationQuery, setDestinationQuery] = useState(defaultDestination);
  const [originPlace, setOriginPlace] = useState<PlaceSuggestion | null>(() =>
    defaultOrigin ? resolvePlaceExact(defaultOrigin) : null
  );
  const [destinationPlace, setDestinationPlace] = useState<PlaceSuggestion | null>(
    () => (defaultDestination ? resolvePlaceExact(defaultDestination) : null)
  );
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [adults, setAdults] = useState(defaultAdults);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<FlightOfferView[] | null>(null);
  const [sort, setSort] = useState<FlightSort>('best');
  const [message, setMessage] = useState<string | null>(null);
  const [originsSearched, setOriginsSearched] = useState<string[]>([]);
  /** Andata e ritorno: prima scegli andata, poi ritorno */
  const [pickStep, setPickStep] = useState<'outbound' | 'return'>('outbound');
  const [selectedOutboundKey, setSelectedOutboundKey] = useState<string | null>(
    null
  );
  const [selectedOutboundOffer, setSelectedOutboundOffer] =
    useState<FlightOfferView | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setCacheReady(true);
      return;
    }
    const cached = loadSearchFormCache<FlightFormCache>(cacheKey);
    if (cached) {
      setTripType(cached.tripType ?? 'oneway');
      setOriginQuery(cached.originQuery ?? '');
      setDestinationQuery(cached.destinationQuery ?? '');
      setOriginPlace(cached.originPlace ?? null);
      setDestinationPlace(cached.destinationPlace ?? null);
      setStartDate(cached.startDate ?? '');
      setEndDate(cached.endDate ?? '');
      setAdults(cached.adults ?? 1);
      setSort(cached.sort ?? 'best');
    }
    setCacheReady(true);
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheReady) return;
    if (defaultOrigin) {
      setOriginQuery(defaultOrigin);
      setOriginPlace(resolvePlaceExact(defaultOrigin));
    }
    if (defaultDestination) {
      setDestinationQuery(defaultDestination);
      setDestinationPlace(resolvePlaceExact(defaultDestination));
    }
    if (defaultStartDate) setStartDate(defaultStartDate);
    if (defaultEndDate) setEndDate(defaultEndDate);
    if (defaultTripType) setTripType(defaultTripType);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync trip context into the OTA form
  }, [cacheReady, defaultOrigin, defaultDestination, defaultStartDate, defaultEndDate, defaultTripType]);

  useEffect(() => {
    if (!cacheKey || !cacheReady) return;
    const payload: FlightFormCache = {
      tripType,
      originQuery,
      destinationQuery,
      originPlace,
      destinationPlace,
      startDate,
      endDate,
      adults,
      sort,
    };
    saveSearchFormCache(cacheKey, payload);
    const onHide = () => saveSearchFormCache(cacheKey, payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [
    adults,
    cacheKey,
    cacheReady,
    destinationPlace,
    destinationQuery,
    endDate,
    originPlace,
    originQuery,
    sort,
    startDate,
    tripType,
  ]);

  const sortedOffers = useMemo(() => {
    if (!offers) return null;
    let list = offers;
    if (tripType === 'roundtrip' && pickStep === 'return' && selectedOutboundKey) {
      list = offers.filter(
        (o) => outboundKey(o) === selectedOutboundKey && o.hasReturn
      );
    } else if (tripType === 'roundtrip' && pickStep === 'outbound') {
      // Una riga per firma andata (prezzo minimo tra le combo)
      const byKey = new Map<string, FlightOfferView>();
      for (const o of offers) {
        const key = outboundKey(o);
        const prev = byKey.get(key);
        if (!prev || o.price < prev.price) byKey.set(key, o);
      }
      list = [...byKey.values()];
    }
    return sortOffers(list, sort);
  }, [offers, pickStep, selectedOutboundKey, sort, tripType]);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? 'Il migliore';

  const swap = () => {
    setOriginQuery(destinationQuery);
    setDestinationQuery(originQuery);
    setOriginPlace(destinationPlace);
    setDestinationPlace(originPlace);
  };

  const search = useCallback(async (overrides?: {
    tripType?: TripType;
    endDate?: string;
  }) => {
    const effectiveTripType = overrides?.tripType ?? tripType;
    const effectiveEndDate = overrides?.endDate ?? endDate;

    const origin = ensurePlace(originQuery, originPlace);
    const destination = ensurePlace(destinationQuery, destinationPlace);

    if (!origin) {
      toast.error(
        hideSearchForm
          ? 'Partenza non riconosciuta. Torna indietro e riprova.'
          : 'Seleziona la partenza dall’elenco suggerito'
      );
      return;
    }
    if (!destination) {
      toast.error(
        hideSearchForm
          ? 'Destinazione non riconosciuta per i voli. Prova un’altra meta.'
          : 'Seleziona la destinazione dall’elenco suggerito'
      );
      return;
    }
    if (!startDate) {
      toast.error('Seleziona la data di partenza');
      return;
    }
    if (effectiveTripType === 'roundtrip' && !effectiveEndDate) {
      toast.error('Seleziona la data di ritorno');
      return;
    }

    setOriginPlace(origin);
    setDestinationPlace(destination);
    setOriginQuery(placeDisplayValue(origin));
    setDestinationQuery(placeDisplayValue(destination));

    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        startDate,
        tripType: effectiveTripType,
        adults: String(Math.min(9, Math.max(1, adults))),
        currency: 'EUR',
      });
      if (effectiveTripType === 'roundtrip') {
        params.set('endDate', effectiveEndDate);
      }

      params.set(
        'destination',
        resolveFlightDestinationIata(destination.code) ??
          resolveFlightDestinationIata(destination.label) ??
          destination.code
      );

      if (origin.kind === 'country' && origin.multiAirport) {
        params.set('originCountry', origin.code);
      } else {
        params.set('originIata', origin.code);
      }

      const res = await fetch(`/api/liteapi/flights/search?${params}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as {
        offers?: FlightOfferView[];
        message?: string;
        error?: string;
        originsSearched?: string[];
      };

      if (res.status === 401) {
        toast.error('Accedi per cercare voli');
        setOffers(null);
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca voli fallita', { duration: 7000 });
        setOffers(null);
        setMessage(data.error ?? 'Ricerca voli non riuscita. Riprova.');
        return;
      }

      const list = data.offers ?? [];
      setOffers(list);
      setOriginsSearched(data.originsSearched ?? []);
      setMessage(list.length ? null : data.message ?? 'Nessuna tariffa trovata');
      setPickStep('outbound');
      setSelectedOutboundKey(null);
      setSelectedOutboundOffer(null);
    } catch {
      toast.error('Errore di rete');
      setOffers(null);
      setMessage('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [
    adults,
    destinationPlace,
    destinationQuery,
    endDate,
    originPlace,
    originQuery,
    startDate,
    tripType,
  ]);

  const autoSearched = useRef(false);
  useEffect(() => {
    if (!cacheReady || !autoSearch || autoSearched.current) return;
    const origin = ensurePlace(originQuery, originPlace);
    const destination = ensurePlace(destinationQuery, destinationPlace);
    if (!origin || !destination || !startDate) return;
    autoSearched.current = true;
    const t = setTimeout(() => void search(), Math.max(0, autoSearchDelayMs));
    return () => clearTimeout(t);
  }, [
    autoSearchDelayMs,
    autoSearch,
    cacheReady,
    destinationPlace,
    destinationQuery,
    originPlace,
    originQuery,
    search,
    startDate,
  ]);

  const lastOriginKey = useRef<string | null>(null);
  useEffect(() => {
    if (!onOriginChange) return;
    const place = originPlace ?? resolvePlaceExact(originQuery);
    if (!place) return;
    const key = `${place.kind}:${place.code}`;
    if (lastOriginKey.current === key) return;
    lastOriginKey.current = key;
    onOriginChange(place);
  }, [onOriginChange, originPlace, originQuery]);

  const composer = variant === 'composer';

  const originLabel = hideSearchForm
    ? originPlace?.kind === 'country'
      ? originPlace.label
      : originPlace?.countryLabel ?? originQuery
    : originPlace
      ? placeDisplayValue(originPlace)
      : originQuery;
  const destLabel = hideSearchForm
    ? destinationPlace?.kind === 'country'
      ? destinationPlace.label
      : destinationPlace?.countryLabel ?? destinationQuery
    : destinationPlace
      ? placeDisplayValue(destinationPlace)
      : destinationQuery;

  const dateSummary = (() => {
    if (!startDate) return 'Date da scegliere';
    try {
      const start = format(parseISO(startDate), 'd MMM yyyy', { locale: it });
      if (tripType === 'roundtrip' && endDate) {
        return `${start} – ${format(parseISO(endDate), 'd MMM yyyy', { locale: it })}`;
      }
      return start;
    } catch {
      return 'Date da scegliere';
    }
  })();

  return (
    <div
      className={cn(
        'space-y-5',
        composer &&
          'composer-panel rounded-[1.25rem] p-4 sm:p-5',
        className
      )}
    >
      {!hideSearchForm ? (
      <div
        className={cn(
          'space-y-4',
          !composer &&
            'rounded-[1.75rem] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/5 sm:p-5'
        )}
      >
        <div className="flex flex-wrap gap-2">
            {(
              [
                ['oneway', 'Solo andata'],
                ['roundtrip', 'Andata e ritorno'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === tripType) return;
                  setTripType(id);
                  setPickStep('outbound');
                  setSelectedOutboundKey(null);
                  setSelectedOutboundOffer(null);

                  let nextEnd = endDate;
                  if (id === 'roundtrip' && !endDate && startDate) {
                    try {
                      nextEnd = format(
                        addDays(parseISO(startDate), 7),
                        'yyyy-MM-dd'
                      );
                      setEndDate(nextEnd);
                    } catch {
                      nextEnd = endDate;
                    }
                  }

                  // Risultati one-way non vanno usati come A/R: ricarica subito
                  if (offers !== null) {
                    setOffers(null);
                    setMessage(null);
                    void search({ tripType: id, endDate: nextEnd });
                  }
                }}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  tripType === id
                    ? composer
                      ? 'bg-[#0b1220] text-white'
                      : 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_1.15fr_auto_auto] lg:items-end">
            <AirportPlaceInput
              label="Partenza"
              value={originQuery}
              selected={originPlace}
              onValueChange={setOriginQuery}
              onClearSelection={() => setOriginPlace(null)}
              onSelect={setOriginPlace}
              placeholder="Milano, FCO, Italia…"
            />

            <div className="flex justify-center lg:pb-1">
              <button
                type="button"
                onClick={swap}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-primary shadow-sm transition hover:bg-slate-50"
                aria-label="Inverti tratta"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            <AirportPlaceInput
              label="Destinazione"
              value={destinationQuery}
              selected={destinationPlace}
              onValueChange={setDestinationQuery}
              onClearSelection={() => setDestinationPlace(null)}
              onSelect={setDestinationPlace}
              placeholder="Tokyo, Giappone, NRT…"
            />

            <FlightDateField
              tripType={tripType}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Passeggeri
              </span>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value) || 1)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-9"
                />
              </div>
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void search()}
                disabled={loading}
                className={cn(
                  'h-12 w-full px-6 text-base font-semibold text-white lg:w-auto',
                  composer
                    ? 'rounded-full bg-[#0b1220] hover:bg-[#0b1220]/90'
                    : 'rounded-xl bg-primary hover:bg-primary/90'
                )}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Cerca
              </Button>
            </div>
          </div>
      </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              className={cn(
                'text-[11px] font-semibold uppercase tracking-[0.18em]',
                composer ? 'text-white/45' : 'text-slate-500'
              )}
            >
              Tratta
            </p>
            <p
              className={cn(
                'mt-1 font-display text-xl font-semibold',
                composer ? 'text-white' : 'text-slate-900'
              )}
            >
              {originLabel} → {destLabel}
            </p>
            <p className={cn('mt-1 text-sm', composer ? 'text-white/55' : 'text-slate-500')}>
              {dateSummary}
            </p>
          </div>
          {onEditDates ? (
            <button
              type="button"
              onClick={onEditDates}
              className={cn(
                'text-sm font-semibold underline underline-offset-4',
                composer
                  ? 'text-white/80 decoration-white/25 hover:text-white hover:decoration-white'
                  : 'text-slate-900 decoration-slate-300 hover:decoration-slate-900'
              )}
            >
              Cambia date del viaggio
            </button>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        {!hideSearchForm ? (
        <div>
          <p className="text-sm font-medium text-slate-700">
            {originLabel} → {destLabel}
            <span className="ml-2 text-xs font-normal text-slate-400">
              {tripType === 'oneway' ? 'Solo andata' : 'Andata e ritorno'}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            {dateSummary}
            {' · '}
            {adults} {adults === 1 ? 'passeggero' : 'passeggeri'}
            {originsSearched.length > 1
              ? ` · da ${originsSearched.slice(0, 5).join(', ')}${originsSearched.length > 5 ? '…' : ''}`
              : null}
          </p>
        </div>
        ) : (
          <span />
        )}

        {offers && offers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('text-xs font-medium', composer ? 'text-white/50' : 'text-slate-500')}>
              {offers.length} offerte
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition',
                    composer
                      ? 'border-white/15 bg-white/8 text-white hover:bg-white/12'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <ArrowDownWideNarrow className={cn('h-3.5 w-3.5', composer ? 'text-accent' : 'text-primary')} />
                  {sortLabel}
                  <ChevronDown className={cn('h-3.5 w-3.5', composer ? 'text-white/40' : 'text-slate-400')} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[240px] rounded-2xl border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl"
              >
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => setSort(opt.id)}
                    className={cn(
                      'cursor-pointer rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:bg-slate-100 focus:text-slate-900',
                      sort === opt.id && 'bg-slate-100'
                    )}
                  >
                    <span className="flex w-4 shrink-0 items-center justify-center">
                      {sort === opt.id ? <Check className="h-4 w-4" /> : null}
                    </span>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      {loading && !offers && (
        <div
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl py-10 text-sm',
            composer ? 'bg-white/[0.04] text-white/60' : 'bg-slate-50 py-14 text-slate-500'
          )}
        >
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Cerchiamo i voli migliori…
        </div>
      )}

      {message && !loading && !hideSearchForm && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </div>
      )}

      {hideSearchForm && !loading && (!offers || offers.length === 0) && (
        <div
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center',
            composer ? 'bg-white/[0.04]' : 'bg-slate-50 py-10'
          )}
        >
          <p className={cn('max-w-sm text-sm', composer ? 'text-white/65' : 'text-slate-600')}>
            {message ?? 'Pronto a cercare i voli per questa tratta.'}
          </p>
          <Button
            type="button"
            onClick={() => void search()}
            className={cn(
              'px-6 font-semibold text-white',
              composer
                ? 'rounded-full bg-accent text-[#0b1220] hover:bg-accent/90'
                : 'rounded-xl bg-primary hover:bg-primary/90'
            )}
          >
            <Search className="mr-2 h-4 w-4" />
            {message ? 'Riprova' : 'Cerca voli'}
          </Button>
        </div>
      )}

      {tripType === 'roundtrip' && offers && offers.length > 0 ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3',
            composer ? 'bg-white/[0.05]' : 'bg-slate-50'
          )}
        >
          <button
            type="button"
            onClick={() => {
              setPickStep('outbound');
              setSelectedOutboundKey(null);
              setSelectedOutboundOffer(null);
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              pickStep === 'outbound'
                ? 'bg-accent text-[#0b1220]'
                : composer
                  ? 'bg-white/8 text-white/70 hover:bg-white/12'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            1. Andata
          </button>
          <span className={composer ? 'text-white/30' : 'text-slate-300'}>→</span>
          <button
            type="button"
            disabled={!selectedOutboundKey}
            onClick={() => selectedOutboundKey && setPickStep('return')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              pickStep === 'return'
                ? 'bg-accent text-[#0b1220]'
                : composer
                  ? 'bg-white/8 text-white/70 hover:bg-white/12 disabled:opacity-40'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40'
            )}
          >
            2. Ritorno
          </button>
          {selectedOutboundOffer ? (
            <p className={cn('ml-auto text-xs', composer ? 'text-white/50' : 'text-slate-500')}>
              Andata {formatTime(selectedOutboundOffer.departureAt)}{' '}
              {selectedOutboundOffer.origin}→{selectedOutboundOffer.destination}
            </p>
          ) : (
            <p className={cn('ml-auto text-xs', composer ? 'text-white/50' : 'text-slate-500')}>
              Seleziona prima l’andata, poi il ritorno
            </p>
          )}
        </div>
      ) : null}

      {sortedOffers && sortedOffers.length > 0 && (
        <ul className="space-y-3">
          {sortedOffers.map((o) => {
            const showReturn =
              tripType === 'roundtrip' && pickStep === 'return' && o.hasReturn;
            const airlineName = showReturn
              ? o.returnAirline ?? o.airline
              : o.airline;
            const airlineCode = showReturn
              ? o.returnAirlineCode ?? o.airlineCode
              : o.airlineCode;
            const airlineLogo = showReturn
              ? o.returnAirlineLogo ?? o.airlineLogo
              : o.airlineLogo;
            const flightNumber = showReturn
              ? o.returnFlightNumber ?? o.flightNumber
              : o.flightNumber;
            const dep = showReturn ? o.returnDepartureAt : o.departureAt;
            const arr = showReturn ? o.returnArrivalAt : o.arrivalAt;
            const from = showReturn ? o.returnOrigin ?? o.destination : o.origin;
            const to = showReturn ? o.returnDestination ?? o.origin : o.destination;
            const duration = showReturn
              ? o.returnDurationMinutes
              : o.durationMinutes;
            const stops = showReturn ? o.returnStops ?? 0 : o.stops;
            const saved = selectedOfferId === o.offerId;

            return (
              <li key={`${o.offerId}-${pickStep}`}>
                <FlightOfferCard
                  offer={{
                    offerId: o.offerId,
                    price: o.price,
                    currency: o.currency,
                    origin: from,
                    destination: to,
                    airline: airlineName,
                    airlineCode,
                    airlineLogo,
                    flightNumber,
                    departureAt: dep,
                    arrivalAt: arr,
                    durationMinutes: duration,
                    stops: stops ?? 0,
                    cabinClass: o.cabinClass,
                  }}
                  dark={composer}
                  saved={saved}
                  kicker={
                    tripType === 'roundtrip'
                      ? pickStep === 'outbound'
                        ? 'Andata'
                        : 'Ritorno'
                      : 'Volo'
                  }
                  priceNote={tripType === 'roundtrip' ? 'andata + ritorno' : 'a persona'}
                  actionLabel={
                    tripType === 'roundtrip' && pickStep === 'outbound'
                      ? 'Scegli andata'
                      : saved
                        ? 'Salvata'
                        : selectLabel ??
                          (tripType === 'roundtrip' ? 'Scegli ritorno' : 'Seleziona')
                  }
                  onAction={() => {
                    if (tripType === 'roundtrip' && pickStep === 'outbound') {
                      if (!o.hasReturn) {
                        toast.error(
                          'Questa offerta non ha un ritorno. Prova un altro volo.'
                        );
                        return;
                      }
                      setSelectedOutboundKey(outboundKey(o));
                      setSelectedOutboundOffer(o);
                      setPickStep('return');
                      toast.message('Andata selezionata', {
                        description: 'Ora scegli il volo di ritorno',
                      });
                      return;
                    }

                    if (tripType === 'roundtrip' && !o.hasReturn) {
                      toast.error('Seleziona un’offerta con andata e ritorno');
                      return;
                    }

                    if (onOfferSelect) {
                      onOfferSelect(o);
                      return;
                    }

                    saveFlightCheckoutDraft({
                      offerId: o.offerId,
                      price: o.price,
                      currency: o.currency,
                      outbound: {
                        origin: o.origin,
                        destination: o.destination,
                        airline: o.airline,
                        airlineCode: o.airlineCode,
                        airlineLogo: o.airlineLogo,
                        departureAt: o.departureAt,
                        arrivalAt: o.arrivalAt,
                        durationMinutes: o.durationMinutes,
                        stops: o.stops,
                        cabinClass: o.cabinClass,
                        flightNumber: o.flightNumber,
                      },
                      returnLeg:
                        tripType === 'roundtrip' && o.hasReturn
                          ? {
                              origin: o.returnOrigin ?? o.destination,
                              destination: o.returnDestination ?? o.origin,
                              airline: o.returnAirline ?? o.airline,
                              airlineCode: o.returnAirlineCode ?? o.airlineCode,
                              airlineLogo: o.returnAirlineLogo ?? o.airlineLogo,
                              departureAt: o.returnDepartureAt,
                              arrivalAt: o.returnArrivalAt,
                              durationMinutes: o.returnDurationMinutes,
                              stops: o.returnStops,
                              flightNumber: o.returnFlightNumber,
                              cabinClass: o.cabinClass,
                            }
                          : null,
                      adults,
                      tripType,
                      createdAt: Date.now(),
                    });
                    router.push('/prenota/voli/checkout');
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
