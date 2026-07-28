'use client';

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
import {
  defaultAffiliateDates,
  sortAffiliateByKey,
} from '@/lib/travel/affiliate-ui';
import {
  loadSearchFormCache,
  saveSearchFormCache,
} from '@/lib/travel/search-form-cache';

type ActivityHit = {
  id: string;
  provider: 'viator' | 'getyourguide';
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  priceFrom?: number | null;
  currency?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  durationMinutes?: number | null;
  bookingUrl: string;
};

type FormCache = {
  city: string;
  query: string;
  startDate: string;
  endDate: string;
  providerFilter: AffiliateProviderFilter;
  minRating: number;
  sort: AffiliateSortKey;
};

export function PrenotaActivitiesClient() {
  const defaults = defaultAffiliateDates();
  const [cacheReady, setCacheReady] = useState(false);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ActivityHit[] | null>(null);
  const [providerFilter, setProviderFilter] =
    useState<AffiliateProviderFilter>('all');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<AffiliateSortKey>('default');

  useEffect(() => {
    const cached = loadSearchFormCache<FormCache>('activities');
    if (cached) {
      setCity(cached.city ?? '');
      setQuery(cached.query ?? '');
      if (cached.startDate) setStartDate(cached.startDate);
      if (cached.endDate) setEndDate(cached.endDate);
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
      providerFilter,
      minRating,
      sort,
    };
    saveSearchFormCache('activities', payload);
    const onHide = () => saveSearchFormCache('activities', payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheReady, city, query, startDate, endDate, providerFilter, minRating, sort]);

  const visible = useMemo(() => {
    if (!results) return null;
    let list =
      providerFilter === 'all'
        ? [...results]
        : results.filter((r) => r.provider === providerFilter);
    if (minRating > 0) {
      list = list.filter((r) => (r.rating ?? 0) >= minRating);
    }
    return sortAffiliateByKey(list, sort);
  }, [results, providerFilter, minRating, sort]);

  const search = async () => {
    const cityLabel = city.trim();
    if (!cityLabel) {
      toast.error('Inserisci una città');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Seleziona le date');
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/activities/search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityLabel,
          query: query.trim(),
          startDate,
          endDate,
        }),
      });
      const data = (await res.json()) as {
        results?: ActivityHit[];
        warnings?: string[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita');
        return;
      }
      for (const w of data.warnings ?? []) toast.message(w);
      const list = data.results ?? [];
      setResults(list);
      if (!list.length && !(data.warnings ?? []).length) {
        toast.message('Nessuna attività trovata');
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  const cards: PrenotaAffiliateCardItem[] | null =
    visible?.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      provider: r.provider,
      rating: r.rating,
      ratingCount: r.ratingCount,
      priceFrom: r.priceFrom,
      currency: r.currency,
      durationMinutes: r.durationMinutes,
      bookingUrl: r.bookingUrl,
      ctaLabel: 'Prenota',
    })) ?? null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Affiliate</span>
        {' — '}
        tour prenotabili via Viator e GetYourGuide. Prenota sul sito partner.
      </div>

      <PrenotaAffiliateSearchBar
        city={city}
        query={query}
        startDate={startDate}
        endDate={endDate}
        onCityChange={setCity}
        onQueryChange={setQuery}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSearch={() => void search()}
        loading={loading}
        queryPlaceholder="Tour, snorkeling, museo…"
        providerFilter={providerFilter}
        onProviderFilterChange={setProviderFilter}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        sort={sort}
        onSortChange={setSort}
        showFilters
      />

      {loading && !results && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cerchiamo attività prenotabili…
        </div>
      )}

      {cards && (
        <>
          <p className="text-xs text-muted-foreground">{cards.length} risultati</p>
          <ul className="grid gap-3.5 lg:grid-cols-2">
            {cards.map((item) => (
              <li key={item.id}>
                <PrenotaAffiliateResultCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
