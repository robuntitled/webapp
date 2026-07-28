'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

export function PrenotaAttractionsClient() {
  const defaults = defaultAffiliateDates();
  const [cacheReady, setCacheReady] = useState(false);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AttractionHit[] | null>(null);
  const [destinationName, setDestinationName] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] =
    useState<AffiliateProviderFilter>('all');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<AffiliateSortKey>('default');

  useEffect(() => {
    const cached = loadSearchFormCache<FormCache>('attractions');
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
    saveSearchFormCache('attractions', payload);
    const onHide = () => saveSearchFormCache('attractions', payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheReady, city, query, startDate, endDate, providerFilter, minRating, sort]);

  const visible = useMemo(() => {
    if (!results) return null;
    // Attrazioni = solo Viator; filtro GYG → lista vuota
    let list =
      providerFilter === 'getyourguide'
        ? []
        : providerFilter === 'viator' || providerFilter === 'all'
          ? [...results]
          : [...results];
    if (minRating > 0) {
      list = list.filter((r) => (r.rating ?? 0) >= minRating);
    }
    // Attrazioni non hanno priceFrom → sort prezzo lascia ordine, rating funziona
    return sortAffiliateByKey(
      list.map((r) => ({ ...r, priceFrom: null as number | null })),
      sort
    );
  }, [results, providerFilter, minRating, sort]);

  const search = async () => {
    const cityLabel = city.trim();
    if (!cityLabel) {
      toast.error('Inserisci una città');
      return;
    }

    setLoading(true);
    setResults(null);
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
      bookingUrl: r.bookingUrl,
      ctaLabel: 'Apri',
    })) ?? null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Attrazioni</span>
        {' — '}
        punti di interesse da Viator. Per tour prenotabili usa{' '}
        <Link href="/prenota/attivita" className="font-medium text-primary hover:underline">
          Attività
        </Link>
        .
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
        <ul className="grid gap-3.5 lg:grid-cols-2">
          {cards.map((item) => (
            <li key={item.id}>
              <PrenotaAffiliateResultCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
