'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PrenotaAffiliateResultCard,
  type PrenotaAffiliateCardItem,
} from '@/components/travel/PrenotaAffiliateResultCard';
import {
  PrenotaAffiliateSearchBar,
  type AffiliateProviderFilter,
  type AffiliateSortKey,
} from '@/components/travel/PrenotaAffiliateSearchBar';
import { withAffiliateBookingPrefs } from '@/lib/travel/affiliate-deeplink';
import {
  defaultAffiliateDates,
  sortAffiliateByKey,
} from '@/lib/travel/affiliate-ui';
import {
  loadSearchFormCache,
  saveSearchFormCache,
} from '@/lib/travel/search-form-cache';
import { cn } from '@/lib/utils';

const HotelsResultsMap = dynamic(
  () =>
    import('@/components/travel/HotelsResultsMap').then((m) => m.HotelsResultsMap),
  { ssr: false }
);

type AttractionHit = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  productCount: number;
  freeAttraction: boolean;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  bookingUrl: string;
};

type FormCache = {
  city: string;
  query: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  providerFilter: AffiliateProviderFilter;
  minRating: number;
  sort: AffiliateSortKey;
};

export function PrenotaAttractionsClient() {
  const defaults = defaultAffiliateDates();
  const [cacheReady, setCacheReady] = useState(false);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AttractionHit[] | null>(null);
  const [destinationName, setDestinationName] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] =
    useState<AffiliateProviderFilter>('all');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<AffiliateSortKey>('default');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const cached = loadSearchFormCache<FormCache>('attractions');
    if (cached) {
      setCity(cached.city ?? '');
      setQuery(cached.query ?? '');
      if (cached.startDate) setStartDate(cached.startDate);
      if (cached.endDate) setEndDate(cached.endDate);
      if (cached.adults) setAdults(cached.adults);
      setChildren(cached.children ?? 0);
      if (cached.providerFilter) setProviderFilter(cached.providerFilter);
      setMinRating(cached.minRating ?? 0);
      if (cached.sort) setSort(cached.sort);
    }
    setCacheReady(true);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    const payload: FormCache = {
      city,
      query,
      startDate,
      endDate,
      adults,
      children,
      providerFilter,
      minRating,
      sort,
    };
    saveSearchFormCache('attractions', payload);
    const onHide = () => saveSearchFormCache('attractions', payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [
    cacheReady,
    city,
    query,
    startDate,
    endDate,
    adults,
    children,
    providerFilter,
    minRating,
    sort,
  ]);

  const visible = useMemo(() => {
    if (!results) return null;
    let list =
      providerFilter === 'getyourguide'
        ? []
        : providerFilter === 'viator' || providerFilter === 'all'
          ? [...results]
          : [...results];
    if (minRating > 0) {
      list = list.filter((r) => (r.rating ?? 0) >= minRating);
    }
    return sortAffiliateByKey(
      list.map((r) => ({ ...r, priceFrom: null as number | null })),
      sort
    );
  }, [results, providerFilter, minRating, sort]);

  const bookingPrefs = useMemo(
    () => ({ startDate, endDate, adults, children }),
    [startDate, endDate, adults, children]
  );

  const mapPins = useMemo(() => {
    if (!visible) return [];
    const pins: { id: string; name: string; lat: number; lng: number }[] = [];
    for (const r of visible) {
      if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;
      pins.push({ id: r.id, name: r.name, lat: r.lat, lng: r.lng });
    }
    return pins;
  }, [visible]);

  const search = async () => {
    const cityLabel = city.trim();
    if (!cityLabel) {
      toast.error('Inserisci una città');
      return;
    }

    setLoading(true);
    setResults(null);
    setHighlightedId(null);
    try {
      const res = await fetch('/api/attractions/search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityLabel,
          query: query.trim(),
          minRating: 0,
          sort: sort === 'rating' ? 'rating' : 'default',
        }),
      });
      const data = (await res.json()) as {
        results?: AttractionHit[];
        destinationName?: string | null;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita');
        return;
      }
      for (const w of data.warnings ?? []) toast.message(w);
      setDestinationName(data.destinationName ?? null);
      setResults(data.results ?? []);
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const cards: PrenotaAffiliateCardItem[] | null =
    visible?.map((r) => ({
      id: r.id,
      title: r.name,
      description: r.description,
      imageUrl: r.imageUrl,
      provider: 'viator' as const,
      rating: r.rating,
      ratingCount: r.ratingCount,
      metaRight: [
        r.freeAttraction ? 'Ingresso libero' : null,
        r.productCount > 0 ? `${r.productCount} esperienze` : null,
        r.address,
      ]
        .filter(Boolean)
        .join(' · '),
      bookingUrl: withAffiliateBookingPrefs(r.bookingUrl, bookingPrefs),
      ctaLabel: 'Apri',
    })) ?? null;

  return (
    <div className="space-y-5">
      <PrenotaAffiliateSearchBar
        city={city}
        query={query}
        startDate={startDate}
        endDate={endDate}
        adults={adults}
        children={children}
        onCityChange={setCity}
        onQueryChange={setQuery}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onAdultsChange={setAdults}
        onChildrenChange={setChildren}
        onSearch={() => void search()}
        loading={loading}
        queryPlaceholder="Colosseo, museo, landmark…"
        providerFilter={providerFilter}
        onProviderFilterChange={setProviderFilter}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        sort={sort}
        onSortChange={setSort}
        showFilters
      />

      {destinationName && results && (
        <p className="text-xs text-muted-foreground">
          Destinazione Viator:{' '}
          <span className="font-medium text-foreground">{destinationName}</span>
          {' · '}
          {cards?.length ?? 0} risultati
        </p>
      )}

      {loading && !results && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cerchiamo attrazioni…
        </div>
      )}

      {cards && (
        <div
          className={cn(
            'grid gap-4',
            mapPins.length > 0 && 'lg:grid-cols-[1fr_minmax(300px,38%)]'
          )}
        >
          <ul className="grid gap-3.5">
            {cards.map((item) => (
              <li
                key={item.id}
                id={`attraction-${item.id}`}
                onMouseEnter={() => setHighlightedId(item.id)}
                className={cn(
                  'rounded-2xl transition',
                  highlightedId === item.id && 'ring-2 ring-primary/35'
                )}
              >
                <PrenotaAffiliateResultCard item={item} />
              </li>
            ))}
          </ul>
          {mapPins.length > 0 ? (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <HotelsResultsMap
                pins={mapPins}
                highlightedId={highlightedId}
                onPinClick={(id) => {
                  setHighlightedId(id);
                  document
                    .getElementById(`attraction-${id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                emptyLabel="Coordinate attrazioni non disponibili"
                className="h-[min(70vh,640px)] min-h-[320px]"
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
