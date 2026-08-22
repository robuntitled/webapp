'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import {
  ArrowDownWideNarrow,
  BedDouble,
  Check,
  ChevronDown,
  Coffee,
  Loader2,
  MapPin,
  Search,
  Star,
  Waves,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AirportPlaceInput } from '@/components/travel/AirportPlaceInput';
import { FlightDateField } from '@/components/travel/FlightDateField';
import { GuestsPicker } from '@/components/travel/GuestsPicker';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  resolvePlaceExact,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
import { saveHotelOfferDraft } from '@/lib/travel/hotel-offer-draft';
import {
  loadSearchFormCache,
  saveSearchFormCache,
  type SearchCacheKey,
} from '@/lib/travel/search-form-cache';
import { cn } from '@/lib/utils';

const HotelsResultsMap = dynamic(
  () =>
    import('@/components/travel/HotelsResultsMap').then((m) => m.HotelsResultsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        Caricamento mappa…
      </div>
    ),
  }
);

type HotelOffer = {
  hotelId: string;
  name: string;
  address: string | null;
  city: string | null;
  photo: string | null;
  stars: number | null;
  rating: number | null;
  roomName: string;
  boardName: string | null;
  boardType: string | null;
  offerId: string;
  totalAmount: number;
  currency: string;
  freeCancellation: boolean;
  refundable: boolean;
  facilities: string[];
  lat?: number | null;
  lng?: number | null;
};

type HotelSort = 'cheapest' | 'rated' | 'stars' | 'name';

const SORT_OPTIONS: Array<{ id: HotelSort; label: string }> = [
  { id: 'cheapest', label: 'Dal più economico' },
  { id: 'rated', label: 'I più valutati' },
  { id: 'stars', label: 'Più stelle' },
  { id: 'name', label: 'Nome A–Z' },
];

type FilterKey = 'freeCancel' | 'breakfast' | 'pool' | 'stars3' | 'stars4';

type LiteApiHotelSearchProps = {
  defaultCity?: string;
  /** @deprecated paese dedotto dalla città */
  defaultCountry?: string;
  defaultCheckin?: string;
  defaultCheckout?: string;
  defaultAdults?: number;
  cacheKey?: SearchCacheKey | null;
  compact?: boolean;
  className?: string;
  preferredHotelIds?: string[];
  autoSearch?: boolean;
  hideSearchForm?: boolean;
  practiceId?: string;
};

type HotelFormCache = {
  cityName: string;
  countryCode?: string;
  checkin: string;
  checkout: string;
  adults: number;
  childrenCount: number;
  childAges: number[];
  filters: Record<FilterKey, boolean>;
};

/** Check-in tra 7 giorni, checkout giorno successivo (minimo 1 notte). */
function defaultHotelDates() {
  const checkin = addDays(new Date(), 7);
  return {
    checkin: format(checkin, 'yyyy-MM-dd'),
    checkout: format(addDays(checkin, 1), 'yyyy-MM-dd'),
  };
}

function ensureCheckoutAfterCheckin(checkin: string, checkout: string) {
  if (!checkin) return checkout;
  if (!checkout || checkout <= checkin) {
    try {
      return format(addDays(parseISO(checkin), 1), 'yyyy-MM-dd');
    } catch {
      return checkout;
    }
  }
  return checkout;
}

function placeCountryCode(place: PlaceSuggestion | null): string | null {
  const cc = place?.countryCode?.trim().toUpperCase();
  if (!cc || cc.length !== 2 || cc === 'XX') return null;
  return cc;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function applyHotelFilters(
  list: HotelOffer[],
  filters: Record<FilterKey, boolean>
): HotelOffer[] {
  let out = list;
  // freeCancel: gestito via LiteAPI refundableRatesOnly in search (non filtro locale)
  if (filters.breakfast) {
    out = out.filter((h) => {
      const board = `${h.boardType ?? ''} ${h.boardName ?? ''}`.toLowerCase();
      return (
        board.includes('bb') ||
        board.includes('breakfast') ||
        board.includes('colazione') ||
        board.includes('bed')
      );
    });
  }
  if (filters.pool) {
    out = out.filter((h) =>
      h.facilities.some((f) => /pool|piscina|swim/i.test(f))
    );
  }
  const minStars = filters.stars4 ? 4 : filters.stars3 ? 3 : 0;
  if (minStars > 0) {
    out = out.filter((h) => (h.stars ?? 0) >= minStars);
  }
  return out;
}

function sortHotels(list: HotelOffer[], sort: HotelSort): HotelOffer[] {
  const copy = [...list];
  if (sort === 'cheapest') {
    copy.sort((a, b) => a.totalAmount - b.totalAmount);
  } else if (sort === 'rated') {
    copy.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  } else if (sort === 'stars') {
    copy.sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1));
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }
  return copy;
}

export function LiteApiHotelSearch({
  defaultCity = '',
  defaultCheckin = '',
  defaultCheckout = '',
  defaultAdults = 1,
  cacheKey = 'hotels',
  compact = false,
  className,
  preferredHotelIds,
  autoSearch = false,
  hideSearchForm = false,
  practiceId,
}: LiteApiHotelSearchProps) {
  const router = useRouter();
  const hotelDefaults = defaultHotelDates();
  const [cacheReady, setCacheReady] = useState(cacheKey == null);
  const [cityName, setCityName] = useState(defaultCity);
  const [cityPlace, setCityPlace] = useState<PlaceSuggestion | null>(() =>
    defaultCity ? resolvePlaceExact(defaultCity) : null
  );
  const [countryCode, setCountryCode] = useState<string | null>(() =>
    placeCountryCode(defaultCity ? resolvePlaceExact(defaultCity) : null)
  );
  const [checkin, setCheckin] = useState(
    defaultCheckin || hotelDefaults.checkin
  );
  const [checkout, setCheckout] = useState(() =>
    ensureCheckoutAfterCheckin(
      defaultCheckin || hotelDefaults.checkin,
      defaultCheckout || hotelDefaults.checkout
    )
  );
  const [adults, setAdults] = useState(defaultAdults);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    freeCancel: false,
    breakfast: false,
    pool: false,
    stars3: false,
    stars4: false,
  });
  const [loading, setLoading] = useState(false);
  /** Risultati grezzi dalla API (senza filtri) */
  const [rawHotels, setRawHotels] = useState<HotelOffer[] | null>(null);
  const [sort, setSort] = useState<HotelSort>('cheapest');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setCacheReady(true);
      return;
    }
    const cached = loadSearchFormCache<HotelFormCache & { countryCode?: string }>(
      cacheKey
    );
    if (cached) {
      const city = cached.cityName ?? '';
      setCityName(city);
      setCityPlace(city ? resolvePlaceExact(city) : null);
      const fromCache =
        cached.countryCode?.trim().toUpperCase().length === 2 &&
        cached.countryCode.toUpperCase() !== 'XX'
          ? cached.countryCode.toUpperCase()
          : null;
      setCountryCode(
        fromCache ||
          placeCountryCode(city ? resolvePlaceExact(city) : null)
      );
      const nextIn = cached.checkin || hotelDefaults.checkin;
      const nextOut = ensureCheckoutAfterCheckin(
        nextIn,
        cached.checkout || hotelDefaults.checkout
      );
      setCheckin(nextIn);
      setCheckout(nextOut);
      setAdults(cached.adults ?? 1);
      setChildrenCount(cached.childrenCount ?? 0);
      setChildAges(cached.childAges ?? []);
      if (cached.filters) setFilters(cached.filters);
    }
    setCacheReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheKey || !cacheReady) return;
    const payload: HotelFormCache = {
      cityName,
      countryCode: countryCode ?? undefined,
      checkin,
      checkout,
      adults,
      childrenCount,
      childAges,
      filters,
    };
    saveSearchFormCache(cacheKey, payload);
    const onHide = () => saveSearchFormCache(cacheKey, payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [
    adults,
    cacheKey,
    cacheReady,
    checkin,
    checkout,
    childAges,
    childrenCount,
    cityName,
    countryCode,
    filters,
  ]);

  const hotels = useMemo(() => {
    if (!rawHotels) return null;
    return sortHotels(applyHotelFilters(rawHotels, filters), sort);
  }, [filters, rawHotels, sort]);

  const mapPins = useMemo(
    () =>
      (hotels ?? [])
        .filter(
          (h): h is HotelOffer & { lat: number; lng: number } =>
            typeof h.lat === 'number' && typeof h.lng === 'number'
        )
        .map((h) => ({
          id: h.hotelId,
          name: h.name,
          lat: h.lat,
          lng: h.lng,
          price: h.totalAmount,
          currency: h.currency,
          imageUrl: h.photo,
          rating: h.rating,
          subtitle: [h.address, h.city].filter(Boolean).join(' · ') || h.roomName,
          ctaLabel: 'Prenota',
        })),
    [hotels]
  );

  const bookHotel = (hotelId: string) => {
    const h = hotels?.find((x) => x.hotelId === hotelId);
    if (!h) return;
    saveHotelOfferDraft({
      hotelId: h.hotelId,
      name: h.name,
      address: h.address,
      city: h.city,
      photo: h.photo,
      stars: h.stars,
      rating: h.rating,
      roomName: h.roomName,
      boardName: h.boardName,
      offerId: h.offerId,
      totalAmount: h.totalAmount,
      currency: h.currency,
      freeCancellation: h.freeCancellation || h.refundable,
      checkin,
      checkout,
      adults,
      childrenAges: childAges.slice(0, childrenCount),
      practiceId,
      savedAt: Date.now(),
    });
    router.push('/prenota/hotel/checkout');
  };

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? 'Dal più economico';

  const toggle = (key: FilterKey) => {
    setFilters((f) => {
      const next = { ...f, [key]: !f[key] };
      // stelle mutuamente esclusive
      if (key === 'stars3' && next.stars3) next.stars4 = false;
      if (key === 'stars4' && next.stars4) next.stars3 = false;
      return next;
    });
  };

  const search = async (opts?: { refundableOnly?: boolean }) => {
    if (!cityName.trim()) {
      toast.error('Inserisci una città');
      return;
    }
    if (!checkin || !checkout) {
      toast.error('Seleziona check-in e check-out');
      return;
    }
    if (checkout <= checkin) {
      toast.error('Il check-out deve essere dopo il check-in');
      return;
    }
    const refundableOnly = opts?.refundableOnly ?? filters.freeCancel;
    setLoading(true);
    setRawHotels(null);
    setHighlightedId(null);
    try {
      const qs = new URLSearchParams({
        cityName: cityName.trim(),
        checkin,
        checkout,
        adults: String(Math.min(9, Math.max(1, adults))),
        currency: 'EUR',
      });
      const ages = childAges.slice(0, childrenCount);
      if (ages.length) qs.set('childrenAges', ages.join(','));
      if (refundableOnly) qs.set('refundableOnly', '1');
      if (countryCode && countryCode.length === 2) {
        qs.set('countryCode', countryCode);
      }
      if (preferredHotelIds?.length) {
        qs.set('hotelIds', preferredHotelIds.join(','));
      }

      const res = await fetch(`/api/liteapi/hotels/search?${qs}`, {
        credentials: 'same-origin',
      });
      const data = (await res.json()) as {
        hotels?: HotelOffer[];
        error?: string;
        count?: number;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita', { duration: 8000 });
        return;
      }
      const list = data.hotels ?? [];
      setRawHotels(list);
      if (!list.length) {
        toast.message(
          refundableOnly
            ? 'Nessuna tariffa con cancellazione gratis — prova altre date o togli il filtro'
            : 'Nessun hotel trovato — prova un’altra città o date'
        );
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const autoSearched = useRef(false);
  useEffect(() => {
    if (!cacheReady || !autoSearch || autoSearched.current) return;
    if (!cityName.trim() || !checkin || !checkout) return;
    autoSearched.current = true;
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch, cacheReady, checkin, checkout, cityName]);

  // Cancellazione gratis: rioserca su LiteAPI (refundableRatesOnly), non solo filtro locale
  useEffect(() => {
    if (!rawHotels) return;
    if (!cityName.trim() || !checkin || !checkout) return;
    void search({ refundableOnly: filters.freeCancel });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al toggle freeCancel
  }, [filters.freeCancel]);

  return (
    <div className={cn('space-y-4', className)}>
      {!hideSearchForm ? (
      <div
        className={cn(
          'overflow-hidden rounded-2xl',
          compact
            ? 'border border-border/60 bg-card p-3'
            : 'bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-px shadow-lg shadow-primary/10'
        )}
      >
        <div className={cn(!compact && 'rounded-[0.95rem] bg-card px-3 py-3 sm:px-3.5')}>
          <div
            className={cn(
              'grid gap-2',
              compact
                ? 'grid-cols-1'
                : 'sm:grid-cols-2 lg:grid-cols-[1.35fr_1.25fr_0.95fr_auto] lg:items-end'
            )}
          >
            <AirportPlaceInput
              label="Destinazione"
              value={cityName}
              selected={cityPlace}
              onValueChange={(v) => {
                setCityName(v);
                setCountryCode(null);
              }}
              onClearSelection={() => {
                setCityPlace(null);
                setCountryCode(null);
              }}
              onSelect={(place) => {
                setCityPlace(place);
                setCityName(place.label);
                setCountryCode(placeCountryCode(place));
              }}
              placeholder="Città o paese…"
              kinds={['city', 'country']}
              showAirportCode={false}
              placesFallback
            />

            <FlightDateField
              tripType="stay"
              startDate={checkin}
              endDate={checkout}
              onStartDateChange={(v) => {
                setCheckin(v);
                setCheckout((prev) => ensureCheckoutAfterCheckin(v, prev));
              }}
              onEndDateChange={(v) =>
                setCheckout(ensureCheckoutAfterCheckin(checkin, v))
              }
            />

            <GuestsPicker
              adults={adults}
              childrenCount={childrenCount}
              onAdultsChange={setAdults}
              onChildrenChange={setChildrenCount}
              childAges={childAges}
              onChildAgesChange={setChildAges}
            />

            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void search()}
                disabled={loading}
                className="h-12 w-full rounded-xl px-5 font-semibold lg:w-auto"
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

          <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2.5">
            <FilterChip
              active={filters.freeCancel}
              onClick={() => toggle('freeCancel')}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancellazione gratis
            </FilterChip>
            <FilterChip
              active={filters.breakfast}
              onClick={() => toggle('breakfast')}
            >
              <Coffee className="h-3.5 w-3.5" />
              Colazione inclusa
            </FilterChip>
            <FilterChip active={filters.pool} onClick={() => toggle('pool')}>
              <Waves className="h-3.5 w-3.5" />
              Piscina
            </FilterChip>
            <FilterChip active={filters.stars3} onClick={() => toggle('stars3')}>
              <Star className="h-3.5 w-3.5" />
              3+ stelle
            </FilterChip>
            <FilterChip active={filters.stars4} onClick={() => toggle('stars4')}>
              <Star className="h-3.5 w-3.5" />
              4+ stelle
            </FilterChip>
            {rawHotels && hotels ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {hotels.length === rawHotels.length
                  ? `${rawHotels.length} hotel`
                  : `${hotels.length} di ${rawHotels.length}`}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      ) : null}

      {loading && !rawHotels && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cerchiamo più tariffe possibili…
        </div>
      )}

      {hotels && hotels.length === 0 && rawHotels && rawHotels.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nessun hotel con questi filtri. Disattivali per vedere tutti i{' '}
          {rawHotels.length} risultati.
        </div>
      ) : null}

      {hotels && hotels.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              {hotels.length} hotel
              {mapPins.length > 0 ? ` · ${mapPins.length} sulla mappa` : null}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary/30"
                >
                  <ArrowDownWideNarrow className="h-3.5 w-3.5 text-primary" />
                  {sortLabel}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px] rounded-xl p-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => setSort(opt.id)}
                    className={cn(
                      'cursor-pointer rounded-lg px-3 py-2.5 text-sm',
                      sort === opt.id && 'bg-primary/10 text-primary'
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

          <div
            className={cn(
              'grid gap-4',
              !compact && mapPins.length > 0 && 'lg:grid-cols-[1fr_minmax(300px,38%)]'
            )}
          >
            <ul className="grid gap-4">
              {hotels.map((h) => (
                <li
                  key={`${h.hotelId}-${h.offerId}`}
                  id={`hotel-${h.hotelId}`}
                  className={cn(
                    'overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md',
                    highlightedId === h.hotelId
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border/70'
                  )}
                  onMouseEnter={() => setHighlightedId(h.hotelId)}
                >
                  <div className={cn('grid', compact ? '' : 'sm:grid-cols-[200px_1fr]')}>
                    <div className="relative aspect-[16/10] bg-muted sm:aspect-auto sm:min-h-[150px]">
                      {h.photo ? (
                        <Image
                          src={h.photo}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="200px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full min-h-[140px] items-center justify-center text-muted-foreground/40">
                          <BedDouble className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:p-5">
                      <div className="min-w-0 space-y-2">
                        <div>
                          <p className="line-clamp-1 font-display text-lg font-semibold">
                            {h.name}
                          </p>
                          {(h.city || h.address) && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="line-clamp-1">
                                {h.address || h.city}
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {h.stars != null && h.stars > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-amber-500">
                              {Array.from({
                                length: Math.min(5, Math.round(h.stars)),
                              }).map((_, i) => (
                                <Star key={i} className="h-3.5 w-3.5 fill-current" />
                              ))}
                            </span>
                          ) : null}
                          {h.rating != null ? (
                            <span className="rounded-md bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">
                              {h.rating.toFixed(1)}
                            </span>
                          ) : null}
                          <span className="text-muted-foreground">{h.roomName}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(h.freeCancellation || h.refundable) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <Check className="h-3 w-3" />
                              Cancellazione gratis
                            </span>
                          )}
                          {(h.boardName || h.boardType) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              <Coffee className="h-3 w-3" />
                              {h.boardName || h.boardType}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-border/60 pt-3 sm:w-36 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                        <div className="text-right">
                          <p className="font-display text-2xl font-semibold tabular-nums text-primary">
                            {h.totalAmount.toFixed(0)}
                            <span className="ml-1 text-sm font-medium text-muted-foreground">
                              {h.currency}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            totale soggiorno
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="rounded-xl font-semibold"
                          onClick={() => bookHotel(h.hotelId)}
                        >
                          Prenota
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {!compact && mapPins.length > 0 ? (
              <div className="lg:sticky lg:top-24 lg:self-start">
                <HotelsResultsMap
                  pins={mapPins}
                  highlightedId={highlightedId}
                  onPinClick={(id) => {
                    setHighlightedId(id);
                    document
                      .getElementById(`hotel-${id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  onBookClick={bookHotel}
                  className="h-[min(70vh,640px)] min-h-[320px]"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
