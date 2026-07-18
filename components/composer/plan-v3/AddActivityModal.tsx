'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ActivityFilters,
  DURATION_FILTERS,
  TYPE_FILTERS,
  endTimeFromStartAndDuration,
  type ActivityTypeFilter,
  type DurationFilter,
} from '@/components/composer/plan-v3/ActivityFilters';
import { ActivityResultsList } from '@/components/composer/plan-v3/ActivityResultsList';
import type { ActivityResultItem } from '@/components/composer/plan-v3/ActivityResultCard';
import { getDraftDestinations } from '@/lib/composer/draft-destinations';
import { haversineKm } from '@/lib/maps/distance';
import type { ComposerBlockType, ComposerDraft } from '@/types/composer';
import { Search, X } from 'lucide-react';

export type AddActivityPayload = {
  type: ComposerBlockType;
  title: string;
  place?: string;
  lat?: number;
  lng?: number;
  time?: string;
  endTime?: string;
  duration?: string;
  price?: number | null;
};

type AddActivityModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ComposerDraft;
  activeDayIndex?: number;
  onConfirm: (payload: AddActivityPayload) => void;
};

/** Cache client: riaprire Aggiungi sullo stesso posto = istantaneo */
const clientCache = new Map<string, { at: number; items: ActivityResultItem[] }>();
const CLIENT_TTL = 10 * 60_000;

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function AddActivityModal({
  open,
  onOpenChange,
  draft,
  activeDayIndex = 1,
  onConfirm,
}: AddActivityModalProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ActivityTypeFilter>('attraction');
  const [duration, setDuration] = useState<DurationFilter>('1h');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [results, setResults] = useState<ActivityResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  // Debounce più corto sulla digitazione; query vuota non aspetta
  const debounced = useDebounced(query, query.trim() ? 180 : 0);
  const abortRef = useRef<AbortController | null>(null);
  const reqId = useRef(0);

  const destinationBounds = useMemo(() => {
    const dests = getDraftDestinations(draft);
    return dests
      .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
      .map((d) => ({
        lat: d.lat,
        lng: d.lng,
        radiusKm: 30,
        label: d.label,
      }));
  }, [draft]);

  const hasDestinations = destinationBounds.length > 0;
  const cacheKeyBase = useMemo(() => {
    const p = destinationBounds[0];
    if (!p) return '';
    return `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
  }, [destinationBounds]);

  const durationValue = DURATION_FILTERS.find((d) => d.id === duration)?.value ?? '1h';
  const blockType =
    TYPE_FILTERS.find((t) => t.id === type)?.blockType ?? 'attraction';

  const handleDurationChange = (next: DurationFilter) => {
    setDuration(next);
    if (startTime) setEndTime(endTimeFromStartAndDuration(startTime, next));
  };

  const handleStartTimeChange = (next: string) => {
    setStartTime(next);
    if (next) setEndTime(endTimeFromStartAndDuration(next, duration));
  };

  const search = useCallback(
    async (q: string) => {
      if (!hasDestinations) {
        setResults([]);
        setSearchHint(
          'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.'
        );
        return;
      }

      const trimmed = q.trim();
      const cacheKey = `${cacheKeyBase}|${trimmed.toLowerCase()}`;
      const hit = clientCache.get(cacheKey);
      if (hit && Date.now() - hit.at < CLIENT_TTL) {
        setResults(hit.items);
        setSearchHint(
          trimmed
            ? null
            : 'Luoghi nell’area della mappa. Cerca un nome per filtrare.'
        );
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const myId = ++reqId.current;

      setLoading(true);
      setSearchHint(null);
      try {
        const res = await fetch('/api/places/google-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: trimmed,
            bounds: destinationBounds,
          }),
          signal: ac.signal,
        });
        if (myId !== reqId.current) return;

        const data = (await res.json()) as {
          results?: {
            id: string;
            label: string;
            subtitle: string;
            lat: number;
            lng: number;
            placeTypeLabel: string;
          }[];
          warning?: string;
          error?: string;
        };
        if (!res.ok) {
          setResults([]);
          setSearchHint(data.error ?? 'Ricerca non disponibile al momento.');
          return;
        }
        const center = destinationBounds[0];
        const mapped: ActivityResultItem[] = (data.results ?? []).map((p) => ({
          id: p.id,
          title: p.label,
          subtitle: p.subtitle || p.placeTypeLabel,
          category: p.placeTypeLabel || 'Luogo',
          lat: p.lat,
          lng: p.lng,
          distanceKm: haversineKm(center, { lat: p.lat, lng: p.lng }),
        }));
        mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        setResults(mapped);
        if (mapped.length > 0) {
          clientCache.set(cacheKey, { at: Date.now(), items: mapped });
        }
        if (mapped.length === 0) {
          setSearchHint(
            data.warning ??
              (trimmed
                ? 'Nessun risultato. Prova un termine diverso.'
                : 'Nessun luogo nell’area della mappa al momento.')
          );
        } else if (!trimmed) {
          setSearchHint('Luoghi nell’area della mappa. Cerca un nome per filtrare.');
        } else if (data.warning) {
          setSearchHint(data.warning);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (myId !== reqId.current) return;
        setResults([]);
        setSearchHint('Ricerca non disponibile al momento. Riprova tra poco.');
      } finally {
        if (myId === reqId.current) setLoading(false);
      }
    },
    [cacheKeyBase, destinationBounds, hasDestinations]
  );

  useEffect(() => {
    if (!open) return;
    void search(debounced);
  }, [debounced, open, search]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setQuery('');
      setType('attraction');
      setDuration('1h');
      setStartTime('');
      setEndTime('');
      setPrice('');
      // Non svuotare results: se riapri e c’è cache, non flasha vuoto
      setSearchHint(null);
      return;
    }

    setQuery('');
    setType('attraction');
    setPrice('');

    // Mostra subito cache area se c’è
    const nearbyKey = `${cacheKeyBase}|`;
    const hit = clientCache.get(nearbyKey);
    if (hit && Date.now() - hit.at < CLIENT_TTL) {
      setResults(hit.items);
      setSearchHint('Luoghi nell’area della mappa. Cerca un nome per filtrare.');
    }

    const day = draft.days.find((d) => d.dayIndex === activeDayIndex);
    const isFirstAddOfDay = !day || day.blocks.length === 0;

    if (isFirstAddOfDay) {
      setDuration('1h');
      setStartTime('08:00');
      setEndTime('09:00');
    } else {
      setDuration('1h');
      setStartTime('');
      setEndTime('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;

  const confirm = (payload: AddActivityPayload) => {
    onConfirm(payload);
    onOpenChange(false);
  };

  const addFromResult = (item: ActivityResultItem) => {
    confirm({
      type: blockType,
      title: item.title,
      place: item.subtitle,
      lat: item.lat,
      lng: item.lng,
      time: startTime || undefined,
      endTime: endTime || undefined,
      duration: durationValue,
      price: parsedPrice,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="composer-v3-modal flex h-[min(92dvh,880px)] w-[min(96vw,920px)] max-w-none flex-col gap-0 overflow-hidden rounded-3xl border-white/10 bg-[#0b1120] p-0 shadow-2xl"
      >
        <DialogHeader className="shrink-0 space-y-3 border-b border-white/10 bg-[#0f172a] px-5 py-4 text-left md:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-display text-xl text-white">Aggiungi</DialogTitle>
              <DialogDescription className="text-sm text-white/50">
                Luoghi popolari nell’area (Google Places). Cerca un nome o scegli dalla lista.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca qualsiasi luogo… museo, ristorante, parco…"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/15"
            />
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b border-white/10 px-5 py-4 md:px-7">
          <ActivityFilters
            type={type}
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            onTypeChange={setType}
            onDurationChange={handleDurationChange}
            onStartTimeChange={handleStartTimeChange}
            onEndTimeChange={setEndTime}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/60">
              Prezzo stimato (opzionale)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Es. 25"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-7">
          {searchHint && results.length > 0 && (
            <p className="mb-3 text-xs text-white/45">{searchHint}</p>
          )}
          <ActivityResultsList
            items={results}
            loading={loading && results.length === 0}
            query={debounced}
            hint={searchHint}
            onAdd={addFromResult}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
