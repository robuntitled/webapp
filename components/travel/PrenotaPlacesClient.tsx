'use client';

import { useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PlaceHit = {
  id: string;
  name: string;
  address?: string | null;
  rating?: number | null;
  lat?: number;
  lng?: number;
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  roma: { lat: 41.9028, lng: 12.4964 },
  rome: { lat: 41.9028, lng: 12.4964 },
  milano: { lat: 45.4642, lng: 9.19 },
  milan: { lat: 45.4642, lng: 9.19 },
  parigi: { lat: 48.8566, lng: 2.3522 },
  paris: { lat: 48.8566, lng: 2.3522 },
  barcellona: { lat: 41.3874, lng: 2.1686 },
  barcelona: { lat: 41.3874, lng: 2.1686 },
  londra: { lat: 51.5074, lng: -0.1278 },
  london: { lat: 51.5074, lng: -0.1278 },
  firenze: { lat: 43.7696, lng: 11.2558 },
  florence: { lat: 43.7696, lng: 11.2558 },
};

type PrenotaPlacesClientProps = {
  category: 'attraction' | 'activity';
  title: string;
};

export function PrenotaPlacesClient({ category, title }: PrenotaPlacesClientProps) {
  const [city, setCity] = useState('Roma');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceHit[] | null>(null);

  const search = async () => {
    const key = city.trim().toLowerCase();
    const coords = CITY_COORDS[key] ?? CITY_COORDS.roma;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/places/google-search', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: query.trim(),
          category,
          bounds: [{ lat: coords.lat, lng: coords.lng, radiusKm: 12, label: city }],
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
          lat?: number;
          lng?: number;
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
        lat: r.lat,
        lng: r.lng,
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
      <div className="grid gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1.5 text-sm">
          <Label>Città</Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Roma"
            className="h-11 rounded-xl"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label>Cerca (opzionale)</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={category === 'attraction' ? 'Colosseo…' : 'Tour, snorkeling…'}
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

      {results && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                {r.address ? (
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {r.address}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                {r.rating != null ? <p>★ {r.rating.toFixed(1)}</p> : null}
                {r.lat != null && r.lng != null ? (
                  <a
                    className="text-primary hover:underline"
                    href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mappa
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
