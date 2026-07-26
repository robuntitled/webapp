'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ArrowDownWideNarrow,
  ArrowRightLeft,
  Check,
  ChevronDown,
  Clock3,
  Loader2,
  Plane,
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
import { saveFlightCheckoutDraft } from '@/lib/travel/flight-checkout-draft';
import {
  loadSearchFormCache,
  saveSearchFormCache,
  type SearchCacheKey,
} from '@/lib/travel/search-form-cache';
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
  /** sessionStorage key; null = non salvare */
  cacheKey?: SearchCacheKey | null;
  className?: string;
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

function formatDuration(mins?: number | null): string {
  if (mins == null || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function stopsLabel(stops?: number): string {
  if (stops == null) return '';
  if (stops <= 0) return 'Diretto';
  if (stops === 1) return '1 scalo';
  return `${stops} scali`;
}

function AirlineBadge({
  name,
  code,
  logo,
  flightNumber,
}: {
  name: string | null;
  code?: string | null;
  logo?: string | null;
  flightNumber?: string | null;
}) {
  const label = name || (code ? `Compagnia ${code}` : 'Compagnia aerea');
  const initials =
    (code || label).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'FL';

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="h-10 w-10 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-contain p-1"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3d91] text-xs font-bold text-white">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
        <p className="truncate text-[11px] text-slate-500">
          {[code, flightNumber].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
    </div>
  );
}

function ensurePlace(query: string, selected: PlaceSuggestion | null): PlaceSuggestion | null {
  if (selected) return selected;
  return resolvePlaceExact(query);
}

export function FlightSearchPanel({
  defaultOrigin = '',
  defaultDestination = '',
  defaultStartDate = '',
  defaultEndDate = '',
  defaultAdults = 1,
  autoSearch = false,
  cacheKey = 'flights',
  className,
}: FlightSearchPanelProps) {
  const router = useRouter();
  const [cacheReady, setCacheReady] = useState(cacheKey == null);

  const [tripType, setTripType] = useState<TripType>('oneway');
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
      toast.error('Seleziona la partenza dall’elenco suggerito');
      return;
    }
    if (!destination) {
      toast.error('Seleziona la destinazione dall’elenco suggerito');
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

      if (destination.kind === 'country' && destination.multiAirport) {
        // hub paese: usa primo aeroporto come destinazione città-codice noto via label
        params.set('destination', destination.label);
      } else {
        params.set('destination', destination.code);
      }

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

  useEffect(() => {
    if (!cacheReady || !autoSearch) return;
    if (!originQuery.trim() || !destinationQuery.trim() || !startDate) return;
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheReady]);

  const originLabel = originPlace ? placeDisplayValue(originPlace) : originQuery;
  const destLabel = destinationPlace
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
    <div className={cn('space-y-6', className)}>
      <div className="rounded-3xl bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-1 shadow-xl shadow-primary/20">
        <div className="relative z-10 space-y-4 overflow-visible rounded-[1.35rem] bg-card p-4 sm:p-5">
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
                    ? 'bg-primary text-white'
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
                className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary/90 lg:w-auto"
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
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
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

        {offers && offers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-slate-500">
              {offers.length} offerte
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowDownWideNarrow className="h-3.5 w-3.5 text-primary" />
                  {sortLabel}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[240px] rounded-xl border-slate-700 bg-[#2a2f36] p-1.5 text-white shadow-2xl"
              >
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => setSort(opt.id)}
                    className={cn(
                      'cursor-pointer rounded-lg px-3 py-2.5 text-sm text-white focus:bg-primary focus:text-white',
                      sort === opt.id && 'bg-white/10'
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
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cerchiamo i voli migliori…
        </div>
      )}

      {message && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </div>
      )}

      {tripType === 'roundtrip' && offers && offers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
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
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            1. Andata
          </button>
          <span className="text-slate-300">→</span>
          <button
            type="button"
            disabled={!selectedOutboundKey}
            onClick={() => selectedOutboundKey && setPickStep('return')}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              pickStep === 'return'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40'
            )}
          >
            2. Ritorno
          </button>
          {selectedOutboundOffer ? (
            <p className="ml-auto text-xs text-slate-500">
              Andata {formatTime(selectedOutboundOffer.departureAt)}{' '}
              {selectedOutboundOffer.origin}→{selectedOutboundOffer.destination}
            </p>
          ) : (
            <p className="ml-auto text-xs text-slate-500">
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

            return (
              <li
                key={`${o.offerId}-${pickStep}`}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="border-b border-slate-100 px-4 py-2 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {tripType === 'roundtrip'
                      ? pickStep === 'outbound'
                        ? 'Andata'
                        : 'Ritorno'
                      : 'Volo'}
                  </p>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-[200px_1fr_150px] sm:items-center sm:p-5">
                  <AirlineBadge
                    name={airlineName}
                    code={airlineCode}
                    logo={airlineLogo}
                    flightNumber={flightNumber}
                  />

                  <div className="flex items-center gap-3 sm:gap-5">
                    <div className="min-w-[64px] text-center">
                      <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">
                        {formatTime(dep)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">{from}</p>
                    </div>

                    <div className="min-w-[96px] flex-1 px-1">
                      <p className="mb-1 flex items-center justify-center gap-1 text-[11px] text-slate-500">
                        <Clock3 className="h-3 w-3" />
                        {formatDuration(duration)}
                      </p>
                      <div className="relative h-px bg-slate-200">
                        <Plane className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-90 text-primary" />
                      </div>
                      <p className="mt-1 text-center text-[11px] font-medium text-slate-500">
                        {stopsLabel(stops)}
                        {o.cabinClass ? ` · ${o.cabinClass}` : ''}
                      </p>
                    </div>

                    <div className="min-w-[64px] text-center">
                      <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">
                        {formatTime(arr)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">{to}</p>
                    </div>
                  </div>

                  <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div className="text-right">
                      <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                        {o.price.toLocaleString('it-IT', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                        <span className="ml-1 text-sm font-medium text-slate-500">
                          {o.currency}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {tripType === 'roundtrip' ? 'andata + ritorno' : 'a persona'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      className="rounded-xl bg-primary px-5 font-semibold hover:bg-primary/90"
                      onClick={() => {
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
                    >
                      {tripType === 'roundtrip' && pickStep === 'outbound'
                        ? 'Scegli andata'
                        : tripType === 'roundtrip'
                          ? 'Scegli ritorno'
                          : 'Seleziona'}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
