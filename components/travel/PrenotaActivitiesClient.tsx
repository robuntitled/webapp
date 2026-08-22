'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PrenotaAffiliateResultCard,
  type PrenotaAffiliateCardItem,
} from '@/components/travel/PrenotaAffiliateResultCard';
import {
  PrenotaAffiliateSearchBar,
  type AffiliateSortKey,
} from '@/components/travel/PrenotaAffiliateSearchBar';
import { Button } from '@/components/ui/button';
import { withAffiliateBookingPrefs } from '@/lib/travel/affiliate-deeplink';
import {
  defaultAffiliateDates,
  sortAffiliateByKey,
} from '@/lib/travel/affiliate-ui';
import {
  loadSearchFormCache,
  saveSearchFormCache,
  type SearchCacheKey,
} from '@/lib/travel/search-form-cache';
import { cn } from '@/lib/utils';

type ActivityHit = {
  id: string;
  provider: 'viator';
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceFrom?: number | null;
  currency?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  durationMinutes?: number | null;
  lat?: number | null;
  lng?: number | null;
  bookingUrl: string;
};

type FormCache = {
  city: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  minRating: number;
  sort: AffiliateSortKey;
};

type PageResult = {
  page: ActivityHit[];
  nextStart: number | null;
  hasMore: boolean;
  destinationName?: string | null;
  warnings?: string[];
};

function formatDuration(mins: number | null | undefined) {
  if (mins == null || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function PrenotaActivitiesClient({
  defaultCity = '',
  defaultStartDate,
  defaultEndDate,
  autoSearch = false,
  hideSearchForm = false,
  cacheKey = 'activities',
}: {
  defaultCity?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  autoSearch?: boolean;
  hideSearchForm?: boolean;
  cacheKey?: SearchCacheKey | null;
} = {}) {
  const defaults = defaultAffiliateDates();
  const [cacheReady, setCacheReady] = useState(!cacheKey);
  const [city, setCity] = useState(defaultCity);
  const [startDate, setStartDate] = useState(defaultStartDate || defaults.startDate);
  const [endDate, setEndDate] = useState(defaultEndDate || defaults.endDate);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState<ActivityHit[] | null>(null);
  const [destinationName, setDestinationName] = useState<string | null>(null);
  const [nextStart, setNextStart] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<AffiliateSortKey>('default');

  useEffect(() => {
    if (!cacheKey) {
      setCacheReady(true);
      return;
    }
    const cached = loadSearchFormCache<FormCache>(cacheKey);
    if (cached) {
      setCity(cached.city ?? defaultCity);
      if (cached.startDate) setStartDate(cached.startDate);
      if (cached.endDate) setEndDate(cached.endDate);
      if (cached.adults) setAdults(cached.adults);
      setChildren(cached.children ?? 0);
      setMinRating(cached.minRating ?? 0);
      if (cached.sort) setSort(cached.sort);
    }
    setCacheReady(true);
  }, [cacheKey, defaultCity]);

  useEffect(() => {
    if (!cacheReady || !cacheKey) return;
    const payload: FormCache = {
      city,
      startDate,
      endDate,
      adults,
      children,
      minRating,
      sort,
    };
    saveSearchFormCache(cacheKey, payload);
    const onHide = () => saveSearchFormCache(cacheKey, payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheReady, cacheKey, city, startDate, endDate, adults, children, minRating, sort]);

  const visible = useMemo(() => {
    if (!results) return null;
    let list = [...results];
    if (minRating > 0) {
      list = list.filter((r) => (r.rating ?? 0) >= minRating);
    }
    return sortAffiliateByKey(list, sort);
  }, [results, minRating, sort]);

  const bookingPrefs = useMemo(
    () => ({ startDate, endDate, adults, children }),
    [startDate, endDate, adults, children]
  );

  const requestPage = async (start: number): Promise<PageResult | null> => {
    const cityLabel = city.trim();
    if (!cityLabel) {
      toast.error('Inserisci una città');
      return null;
    }
    const res = await fetch('/api/activities/search', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: cityLabel,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        start,
      }),
    });
    const data = (await res.json()) as {
      results?: ActivityHit[];
      destinationName?: string | null;
      warnings?: string[];
      error?: string;
      nextStart?: number | null;
      hasMore?: boolean;
    };
    if (!res.ok) {
      toast.error(data.error ?? 'Ricerca fallita');
      return null;
    }
    return {
      page: data.results ?? [],
      nextStart: data.nextStart ?? null,
      hasMore: Boolean(data.hasMore),
      destinationName: data.destinationName,
      warnings: data.warnings,
    };
  };

  const mergePages = (prev: ActivityHit[] | null, page: ActivityHit[]) => {
    if (!prev) return page;
    const seen = new Set(prev.map((r) => r.id));
    return [...prev, ...page.filter((r) => !seen.has(r.id))];
  };

  const fetchPage = async (start: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setResults(null);
    }

    try {
      const first = await requestPage(start);
      if (!first) return;

      if (!append) {
        for (const w of first.warnings ?? []) toast.message(w);
        setDestinationName(first.destinationName ?? null);
      }

      let merged = first.page;
      let cursor = first.nextStart;
      let more = first.hasMore;

      // Prima ricerca: carica subito una seconda pagina se disponibile
      if (!append && more && cursor != null) {
        const second = await requestPage(cursor);
        if (second) {
          merged = mergePages(merged, second.page);
          cursor = second.nextStart;
          more = second.hasMore;
        }
      }

      if (append) {
        setResults((prev) => mergePages(prev, first.page));
      } else {
        setResults(merged);
      }
      setNextStart(cursor);
      setHasMore(more);
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const autoSearched = useRef(false);
  useEffect(() => {
    if (!cacheReady || !autoSearch || autoSearched.current) return;
    if (!city.trim()) return;
    autoSearched.current = true;
    void fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch, cacheReady, city]);

  const cards: PrenotaAffiliateCardItem[] | null =
    visible?.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      provider: 'viator' as const,
      rating: r.rating,
      ratingCount: r.ratingCount,
      priceFrom: r.priceFrom,
      currency: r.currency,
      metaRight: [formatDuration(r.durationMinutes)].filter(Boolean).join(' · '),
      bookingUrl: withAffiliateBookingPrefs(r.bookingUrl, bookingPrefs),
      ctaLabel: 'Prenota',
    })) ?? null;

  return (
    <div className="space-y-4">
      {!hideSearchForm ? (
      <PrenotaAffiliateSearchBar
        city={city}
        startDate={startDate}
        endDate={endDate}
        adults={adults}
        children={children}
        onCityChange={setCity}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onAdultsChange={setAdults}
        onChildrenChange={setChildren}
        onSearch={() => void fetchPage(1, false)}
        loading={loading}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        sort={sort}
        onSortChange={setSort}
        showFilters
      />
      ) : null}

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
          Cerchiamo attività…
        </div>
      )}

      {cards && (
        <div className="space-y-3.5">
          <ul className="grid gap-3.5">
            {cards.map((item) => (
              <li key={item.id} id={`activity-${item.id}`}>
                <PrenotaAffiliateResultCard item={item} />
              </li>
            ))}
          </ul>
          {hasMore && nextStart != null ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-[220px] rounded-xl font-semibold"
                disabled={loadingMore}
                onClick={() => void fetchPage(nextStart, true)}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Caricamento…
                  </>
                ) : (
                  'Carica altri'
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
