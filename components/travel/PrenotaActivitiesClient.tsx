'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader2, Search, Star, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import {
  AffiliateBookingDialog,
  type AffiliateOfferPreview,
} from '@/components/travel/AffiliateBookingDialog';
import {
  GygDestinationWidget,
  ViatorDestinationWidget,
} from '@/components/travel/AffiliateDestinationWidgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  loadSearchFormCache,
  saveSearchFormCache,
} from '@/lib/travel/search-form-cache';
import { cn } from '@/lib/utils';

type ActivityHit = AffiliateOfferPreview & {
  durationMinutes?: number | null;
};

type FormCache = { city: string; query: string };

const CITY_SHORTCUTS = ['Roma', 'Milano', 'Firenze', 'Barcellona', 'Parigi', 'Londra'] as const;

function formatPrice(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return null;
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency || 'EUR'}`;
  }
}

function formatDuration(mins: number | null | undefined) {
  if (mins == null || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function providerLabel(p: ActivityHit['provider']) {
  return p === 'viator' ? 'Viator' : 'GetYourGuide';
}

export function PrenotaActivitiesClient() {
  const [cacheReady, setCacheReady] = useState(false);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ActivityHit[] | null>(null);
  const [providerFilter, setProviderFilter] = useState<'all' | 'viator' | 'getyourguide'>(
    'all'
  );
  const [selected, setSelected] = useState<ActivityHit | null>(null);

  useEffect(() => {
    const cached = loadSearchFormCache<FormCache>('activities');
    if (cached) {
      setCity(cached.city ?? '');
      setQuery(cached.query ?? '');
    }
    setCacheReady(true);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    const payload: FormCache = { city, query };
    saveSearchFormCache('activities', payload);
    const onHide = () => saveSearchFormCache('activities', payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheReady, city, query]);

  const visible = useMemo(() => {
    if (!results) return null;
    if (providerFilter === 'all') return results;
    return results.filter((r) => r.provider === providerFilter);
  }, [results, providerFilter]);

  const search = async (cityOverride?: string) => {
    const cityLabel = (cityOverride ?? city).trim();
    if (!cityLabel) {
      toast.error('Inserisci una città');
      return;
    }
    if (cityOverride) setCity(cityOverride);

    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/activities/search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: cityLabel, query: query.trim() }),
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

  const widgetCity = city.trim();
  const showWidgetHint =
    !process.env.NEXT_PUBLIC_VIATOR_PARTNER_ID && !process.env.NEXT_PUBLIC_GYG_PARTNER_ID;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Affiliate</span>
        {' — '}
        apri un risultato per la scheda in-app. Il pagamento resta su Viator/GetYourGuide
        (commissione NomadLink).
      </div>

      <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-1 shadow-xl shadow-primary/15">
        <div className="space-y-3 rounded-[1.35rem] bg-card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
                placeholder="Tour, snorkeling, museo…"
                className="h-11 rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void search();
                }}
              />
            </label>
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

      {results && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'Tutti'],
              ['viator', 'Viator'],
              ['getyourguide', 'GetYourGuide'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setProviderFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                providerFilter === key
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {visible?.length ?? 0} attività
          </span>
        </div>
      )}

      {loading && !results && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cerchiamo attività prenotabili…
        </div>
      )}

      {visible && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((r) => {
            const price = formatPrice(r.priceFrom, r.currency);
            const duration = formatDuration(r.durationMinutes);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r)}
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
                        <Ticket className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            r.provider === 'viator'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
                          )}
                        >
                          {providerLabel(r.provider)}
                        </span>
                        {duration ? (
                          <span className="text-[10px] text-muted-foreground">{duration}</span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 font-display text-sm font-semibold leading-snug">
                        {r.title}
                      </p>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        {r.rating != null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                            {r.rating.toFixed(1)}
                            {r.ratingCount != null ? (
                              <span className="text-muted-foreground">({r.ratingCount})</span>
                            ) : null}
                          </span>
                        ) : null}
                        {price ? (
                          <p className="mt-0.5 text-sm font-semibold text-foreground">
                            da {price}
                          </p>
                        ) : null}
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
                        Apri
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {widgetCity ? (
        <div className="space-y-4 border-t border-border/50 pt-4">
          <p className="text-sm font-medium text-foreground">Widget partner · {widgetCity}</p>
          <ViatorDestinationWidget searchTerm={widgetCity} />
          <GygDestinationWidget query={`${widgetCity}, Italia`} />
          {showWidgetHint ? (
            <p className="text-xs text-muted-foreground">
              Per i widget embed: aggiungi su Vercel{' '}
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_VIATOR_PARTNER_ID</code>,{' '}
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_VIATOR_WIDGET_REF</code> e{' '}
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_GYG_PARTNER_ID</code>.
            </p>
          ) : null}
        </div>
      ) : null}

      <AffiliateBookingDialog
        offer={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
