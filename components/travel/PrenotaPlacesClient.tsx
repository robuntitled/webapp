'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Loader2, MapPin, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  loadSearchFormCache,
  saveSearchFormCache,
  type SearchCacheKey,
} from '@/lib/travel/search-form-cache';
import { cn } from '@/lib/utils';

type PlaceHit = {
  id: string;
  name: string;
  address?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  lat?: number;
  lng?: number;
  photoUrl?: string | null;
};

type PlacesFormCache = {
  city: string;
  query: string;
};

type PrenotaPlacesClientProps = {
  category: 'attraction' | 'activity';
  title: string;
};

const CITY_SHORTCUTS = ['Roma', 'Milano', 'Firenze', 'Barcellona', 'Parigi', 'Londra'] as const;

export function PrenotaPlacesClient({ category, title }: PrenotaPlacesClientProps) {
  const cacheKey: SearchCacheKey =
    category === 'attraction' ? 'attractions' : 'activities';
  const [cacheReady, setCacheReady] = useState(false);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceHit[] | null>(null);

  useEffect(() => {
    const cached = loadSearchFormCache<PlacesFormCache>(cacheKey);
    if (cached) {
      setCity(cached.city ?? '');
      setQuery(cached.query ?? '');
    }
    setCacheReady(true);
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheReady) return;
    const payload: PlacesFormCache = { city, query };
    saveSearchFormCache(cacheKey, payload);
    const onHide = () => saveSearchFormCache(cacheKey, payload);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [cacheKey, cacheReady, city, query]);

  const resolveCity = async (
    label: string
  ): Promise<{ lat: number; lng: number; label: string } | null> => {
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(label)}`, {
      credentials: 'same-origin',
    });
    const data = (await res.json()) as {
      results?: Array<{ label?: string; lat?: number; lng?: number }>;
      error?: string;
    };
    if (!res.ok) {
      toast.error(data.error ?? 'Città non trovata');
      return null;
    }
    const hit = (data.results ?? []).find(
      (r) => typeof r.lat === 'number' && typeof r.lng === 'number'
    );
    if (!hit || hit.lat == null || hit.lng == null) {
      toast.error('Città non riconosciuta. Prova un nome più preciso.');
      return null;
    }
    return { lat: hit.lat, lng: hit.lng, label: hit.label || label };
  };

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
      const coords = await resolveCity(cityLabel);
      if (!coords) return;

      const res = await fetch('/api/places/google-search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: query.trim(),
          category,
          bounds: [
            {
              lat: coords.lat,
              lng: coords.lng,
              radiusKm: 12,
              label: coords.label,
            },
          ],
        }),
      });
      const data = (await res.json()) as {
        results?: Array<{
          id?: string;
          placeId?: string;
          name?: string;
          title?: string;
          address?: string;
          subtitle?: string;
          rating?: number;
          ratingCount?: number;
          lat?: number;
          lng?: number;
          photoUrl?: string | null;
        }>;
        error?: string;
        warning?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Ricerca fallita');
        return;
      }
      if (data.warning) toast.message(data.warning);
      const list: PlaceHit[] = (data.results ?? []).map((r, i) => ({
        id: r.id || r.placeId || `${category}-${i}`,
        name: r.name || r.title || 'Luogo',
        address: r.address || r.subtitle || null,
        rating: r.rating ?? null,
        ratingCount: r.ratingCount ?? null,
        lat: r.lat,
        lng: r.lng,
        photoUrl: r.photoUrl ?? null,
      }));
      setResults(list);
      if (!list.length) toast.message(`Nessun risultato per ${title.toLowerCase()}`);
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Scoperta luoghi</span>
        {' — '}
        risultati da Google Places con foto e mappe. I ticket partner arriveranno dopo; intanto
        esplora e apri la mappa.
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
                placeholder={
                  category === 'attraction' ? 'Colosseo, museo…' : 'Tour, snorkeling…'
                }
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

      {loading && !results && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Cerchiamo {title.toLowerCase()}…
        </div>
      )}

      {results && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.map((r) => (
            <li
              key={r.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="grid grid-cols-[112px_1fr]">
                <div className="relative aspect-square bg-muted">
                  {r.photoUrl ? (
                    <Image
                      src={r.photoUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="112px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <MapPin className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold">{r.name}</p>
                    {r.address ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {r.address}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {r.rating != null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        {r.rating.toFixed(1)}
                        {r.ratingCount != null ? (
                          <span className="text-muted-foreground">({r.ratingCount})</span>
                        ) : null}
                      </span>
                    ) : (
                      <span />
                    )}
                    {r.lat != null && r.lng != null ? (
                      <a
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Mappa
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
