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
};

type TripType = 'oneway' | 'roundtrip';

type FlightSearchPanelProps = {
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultAdults?: number;
  autoSearch?: boolean;
  className?: string;
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
  defaultOrigin = 'Milano',
  defaultDestination = 'Londra',
  defaultStartDate,
  defaultEndDate,
  defaultAdults = 1,
  autoSearch = true,
  className,
}: FlightSearchPanelProps) {
  const router = useRouter();
  const dateDefaults = useMemo(() => {
    const start = defaultStartDate
      ? parseISO(defaultStartDate)
      : addDays(new Date(), 21);
    const end = defaultEndDate ? parseISO(defaultEndDate) : addDays(start, 7);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [defaultStartDate, defaultEndDate]);

  const initialOrigin = resolvePlaceExact(defaultOrigin);
  const initialDest = resolvePlaceExact(defaultDestination);

  const [tripType, setTripType] = useState<TripType>('oneway');
  const [originQuery, setOriginQuery] = useState(
    initialOrigin ? placeDisplayValue(initialOrigin) : defaultOrigin
  );
  const [destinationQuery, setDestinationQuery] = useState(
    initialDest ? placeDisplayValue(initialDest) : defaultDestination
  );
  const [originPlace, setOriginPlace] = useState<PlaceSuggestion | null>(initialOrigin);
  const [destinationPlace, setDestinationPlace] = useState<PlaceSuggestion | null>(
    initialDest
  );
  const [startDate, setStartDate] = useState(dateDefaults.startDate);
  const [endDate, setEndDate] = useState(dateDefaults.endDate);
  const [adults, setAdults] = useState(defaultAdults);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<FlightOfferView[] | null>(null);
  const [sort, setSort] = useState<FlightSort>('best');
  const [message, setMessage] = useState<string | null>(null);
  const [originsSearched, setOriginsSearched] = useState<string[]>([]);

  const sortedOffers = useMemo(
    () => (offers ? sortOffers(offers, sort) : null),
    [offers, sort]
  );

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? 'Il migliore';

  const swap = () => {
    setOriginQuery(destinationQuery);
    setDestinationQuery(originQuery);
    setOriginPlace(destinationPlace);
    setDestinationPlace(originPlace);
  };

  const search = useCallback(async () => {
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

    setOriginPlace(origin);
    setDestinationPlace(destination);
    setOriginQuery(placeDisplayValue(origin));
    setDestinationQuery(placeDisplayValue(destination));

    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        startDate,
        tripType,
        adults: String(Math.min(9, Math.max(1, adults))),
        currency: 'EUR',
      });
      if (tripType === 'roundtrip') params.set('endDate', endDate);

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
    if (autoSearch) void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const originLabel = originPlace ? placeDisplayValue(originPlace) : originQuery;
  const destLabel = destinationPlace
    ? placeDisplayValue(destinationPlace)
    : destinationQuery;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="rounded-3xl bg-gradient-to-br from-[#052e6b] via-[#0b4db5] to-[#0770e3] p-1 shadow-xl shadow-blue-900/20">
        <div className="relative z-10 space-y-4 overflow-visible rounded-[1.35rem] bg-white p-4 sm:p-5">
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
                onClick={() => setTripType(id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                  tripType === id
                    ? 'bg-[#0770e3] text-white'
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0770e3] shadow-sm transition hover:bg-slate-50"
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
                className="h-12 w-full rounded-xl bg-[#0770e3] px-6 text-base font-semibold text-white hover:bg-[#0558b8] lg:w-auto"
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
            {format(parseISO(startDate), 'd MMM yyyy', { locale: it })}
            {tripType === 'roundtrip' ? (
              <>
                {' – '}
                {format(parseISO(endDate), 'd MMM yyyy', { locale: it })}
              </>
            ) : null}
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
                  <ArrowDownWideNarrow className="h-3.5 w-3.5 text-[#0770e3]" />
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
                      'cursor-pointer rounded-lg px-3 py-2.5 text-sm text-white focus:bg-[#0770e3] focus:text-white',
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
          <Loader2 className="h-5 w-5 animate-spin text-[#0770e3]" />
          Cerchiamo i voli migliori…
        </div>
      )}

      {message && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {message}
        </div>
      )}

      {sortedOffers && sortedOffers.length > 0 && (
        <ul className="space-y-3">
          {sortedOffers.map((o) => (
            <li
              key={o.offerId}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-[#0770e3]/40 hover:shadow-md"
            >
              <div className="grid gap-4 p-4 sm:grid-cols-[200px_1fr_150px] sm:items-center sm:p-5">
                <AirlineBadge
                  name={o.airline}
                  code={o.airlineCode}
                  logo={o.airlineLogo}
                  flightNumber={o.flightNumber}
                />

                <div className="flex items-center gap-3 sm:gap-5">
                  <div className="min-w-[64px] text-center">
                    <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">
                      {formatTime(o.departureAt)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">{o.origin}</p>
                  </div>

                  <div className="min-w-[96px] flex-1 px-1">
                    <p className="mb-1 flex items-center justify-center gap-1 text-[11px] text-slate-500">
                      <Clock3 className="h-3 w-3" />
                      {formatDuration(o.durationMinutes)}
                    </p>
                    <div className="relative h-px bg-slate-200">
                      <Plane className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[#0770e3]" />
                    </div>
                    <p className="mt-1 text-center text-[11px] font-medium text-slate-500">
                      {stopsLabel(o.stops)}
                      {o.cabinClass ? ` · ${o.cabinClass}` : ''}
                    </p>
                  </div>

                  <div className="min-w-[64px] text-center">
                    <p className="font-display text-2xl font-semibold tabular-nums text-slate-900">
                      {formatTime(o.arrivalAt)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {o.destination}
                    </p>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold tabular-nums text-[#052e6b]">
                      {o.price.toLocaleString('it-IT', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                      <span className="ml-1 text-sm font-medium text-slate-500">
                        {o.currency}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">a persona</p>
                  </div>
                  <Button
                    type="button"
                    className="rounded-xl bg-[#0770e3] px-5 font-semibold hover:bg-[#0558b8]"
                    onClick={() => {
                      saveFlightCheckoutDraft({
                        offerId: o.offerId,
                        price: o.price,
                        currency: o.currency,
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
                        adults,
                        tripType,
                        createdAt: Date.now(),
                      });
                      router.push('/prenota/voli/checkout');
                    }}
                  >
                    Seleziona
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
