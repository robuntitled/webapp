'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { addDays, format } from 'date-fns';
import { Landmark, Loader2, Search, Star, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import {
  AffiliateBookingDialog,
  type AffiliateOfferPreview,
} from '@/components/travel/AffiliateBookingDialog';
import { ViatorDestinationWidget } from '@/components/travel/AffiliateDestinationWidgets';
import { FlightDateField } from '@/components/travel/FlightDateField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  loadSearchFormCache,
  saveSearchFormCache,
} from '@/lib/travel/search-form-cache';
import { cn } from '@/lib/utils';

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
  withTours: boolean;
  freeOnly: boolean;
  minRating: number;
  sort: 'rating' | 'tours' | 'name' | 'default';
};

const CITY_SHORTCUTS = ['Roma', 'Milano', 'Firenze', 'Barcellona', 'Parigi', 'Londra'] as const;

const SORT_OPTIONS = [
  { value: 'rating', label: 'Più votate' },
  { value: 'tours', label: 'Più tour' },
  { value: 'name', label: 'Nome A–Z' },
] as const;

function defaultDates() {
  const start = addDays(new Date(), 7);
  const end = addDays(start, 3);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

export function PrenotaAttractionsClient() {
  const defaults = defaultDates();
  const [cacheReady, setCacheReady] = useState(false);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [withTours, setWithTours] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<'rating' | 'tours' | 'name' | 'default'>('rating');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AttractionHit[] | null>(null);
  const [destinationName, setDestinationName] = useState<string | null>(null);
  const [selected, setSelected] = useState<AffiliateOfferPreview | null>(null);

  useEffect(() => {
    const cached = loadSearchFormCache<FormCache>('attractions');
    if (cached) {
      setCity(cached.city ?? '');
      setQuery(cached.query ?? '');
      if (cached.startDate) setStartDate(cached.startDate);
      if (cached.endDate) setEndDate(cached.endDate);
      setWithTours(Boolean(cached.withTours));
      setFreeOnly(Boolean(cached.freeOnly));
      setMinRating(cached.minRating ?? 0);
      setSort(cached.sort ?? 'rating');
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
      withTours,
      freeOnly,
      minRating,
      sort,
    };
    saveSearchFormCache('attractions', payload);
    const onHide = () => saveSearchFormCache('attractions', payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheReady, city, query, startDate, endDate, withTours, freeOnly, minRating, sort]);

  const search = async (
    cityOverride?: string,
    filterOverride?: Partial<
      Pick<FormCache, 'withTours' | 'freeOnly' | 'minRating' | 'sort'>
    >
  ) => {
    const cityLabel = (cityOverride ?? city).trim();
    if (!cityLabel) {
      toast.error('Inserisci una città');
      return;
    }
    if (cityOverride) setCity(cityOverride);

    const filters = {
      withTours: filterOverride?.withTours ?? withTours,
      freeOnly: filterOverride?.freeOnly ?? freeOnly,
      minRating: filterOverride?.minRating ?? minRating,
      sort: filterOverride?.sort ?? sort,
    };

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
          ...filters,
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

  const toggleWithTours = () => {
    const next = !withTours;
    setWithTours(next);
    if (city.trim()) void search(undefined, { withTours: next });
  };
  const toggleFreeOnly = () => {
    const next = !freeOnly;
    setFreeOnly(next);
    if (city.trim()) void search(undefined, { freeOnly: next });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Attrazioni</span>
        {' — '}
        monumenti e punti di interesse da Viator. Per tour prenotabili usa{' '}
        <Link href="/prenota/attivita" className="font-medium text-primary hover:underline">
          Attività
        </Link>
        .
      </div>

      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-1 shadow-xl shadow-primary/15">
        <div className="space-y-3 rounded-[1.35rem] bg-card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.1fr_auto]">
            <label className="space-y-1.5 text-sm">
              <Label>Città</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Città o destinazione…"
                className="h-11 rounded-xl"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <Label>Cerca (opzionale)</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Colosseo, museo…"
                className="h-11 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void search();
                }}
              />
            </label>
            <FlightDateField
              tripType="stay"
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="h-11 w-full rounded-xl sm:w-auto"
                onClick={() => void search()}
                disabled={loading}
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

          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={toggleWithTours}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                withTours
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              Con tour
            </button>
            <button
              type="button"
              onClick={toggleFreeOnly}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                freeOnly
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              Ingresso libero
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Min. stelle
              <select
                value={minRating}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setMinRating(next);
                  if (city.trim()) void search(undefined, { minRating: next });
                }}
                className="h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value={0}>Tutte</option>
                <option value={3}>3+</option>
                <option value={4}>4+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Ordina
              <select
                value={sort}
                onChange={(e) => {
                  const next = e.target.value as FormCache['sort'];
                  setSort(next);
                  if (city.trim()) void search(undefined, { sort: next });
                }}
                className="h-7 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CITY_SHORTCUTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => void search(c)}
                className={cn(
                  'rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition',
                  'hover:border-primary/30 hover:text-foreground',
                  city === c && 'border-primary/40 bg-primary/5 text-primary'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {destinationName && results && (
        <p className="text-xs text-muted-foreground">
          Destinazione Viator: <span className="font-medium text-foreground">{destinationName}</span>
          {' · '}
          {results.length} attrazioni
        </p>
      )}

      {loading && !results && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cerchiamo attrazioni…
        </div>
      )}

      {results && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() =>
                  setSelected({
                    id: r.id,
                    provider: 'viator',
                    title: r.name,
                    description: r.description,
                    imageUrl: r.imageUrl,
                    rating: r.rating,
                    ratingCount: r.ratingCount,
                    bookingUrl: r.bookingUrl,
                  })
                }
                className="grid w-full grid-cols-[112px_1fr] overflow-hidden rounded-2xl border border-border/60 bg-card text-left transition hover:border-primary/30 hover:shadow-md"
              >
                <div className="relative aspect-square bg-muted">
                  {r.imageUrl ? (
                    <Image
                      src={r.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <Landmark className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                        Viator
                      </span>
                      {r.freeAttraction ? (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Libero
                        </span>
                      ) : null}
                      {r.productCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Ticket className="h-3 w-3" />
                          {r.productCount} tour
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 font-display text-sm font-semibold leading-snug">
                      {r.name}
                    </p>
                    {r.address ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {r.address}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      {r.rating != null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium">
                          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                          {r.rating.toFixed(1)}
                          {r.ratingCount != null ? (
                            <span className="text-muted-foreground">({r.ratingCount})</span>
                          ) : null}
                        </span>
                      ) : (
                        <span />
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
                      Apri
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {city.trim() ? (
        <div className="border-t border-border/50 pt-4">
          <ViatorDestinationWidget
            searchTerm={city.trim()}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      ) : null}

      <AffiliateBookingDialog
        offer={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        city={city.trim()}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
