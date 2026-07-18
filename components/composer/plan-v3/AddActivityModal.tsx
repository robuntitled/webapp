'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  /** Giorno attivo: serve per default 08:00–09:00 al primo aggiungi del giorno. */
  activeDayIndex?: number;
  onConfirm: (payload: AddActivityPayload) => void;
};

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
  /** Solo categoria del blocco da salvare — non filtra la ricerca */
  const [type, setType] = useState<ActivityTypeFilter>('attraction');
  const [duration, setDuration] = useState<DurationFilter>('1h');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [results, setResults] = useState<ActivityResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const debounced = useDebounced(query, 320);

  // Area della mappa = destinazioni del viaggio (centro ricerca)
  const destinationBounds = useMemo(() => {
    const dests = getDraftDestinations(draft);
    return dests
      .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
      .map((d) => ({
        lat: d.lat,
        lng: d.lng,
        radiusKm: 40,
        label: d.label,
      }));
  }, [draft]);

  const hasDestinations = destinationBounds.length > 0;

  const durationValue = DURATION_FILTERS.find((d) => d.id === duration)?.value ?? '1h';
  const blockType =
    TYPE_FILTERS.find((t) => t.id === type)?.blockType ?? 'attraction';

  const handleDurationChange = (next: DurationFilter) => {
    setDuration(next);
    if (startTime) {
      setEndTime(endTimeFromStartAndDuration(startTime, next));
    }
  };

  const handleStartTimeChange = (next: string) => {
    setStartTime(next);
    if (next) {
      setEndTime(endTimeFromStartAndDuration(next, duration));
    }
  };

  /** Ricerca libera (tutto) o, se query vuota, luoghi nell'area mappa. Non usa la categoria. */
  const search = useCallback(
    async (q: string) => {
      if (!hasDestinations) {
        setResults([]);
        setSearchHint(
          'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.'
        );
        return;
      }

      setLoading(true);
      setSearchHint(null);
      try {
        const res = await fetch('/api/places/google-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: q.trim(),
            bounds: destinationBounds,
          }),
        });
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
        // Più vicini prima
        mapped.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        setResults(mapped);
        if (mapped.length === 0) {
          setSearchHint(
            data.warning ??
              (q.trim().length >= 2
                ? 'Nessun risultato. Prova un termine diverso.'
                : 'Nessun luogo nell’area della mappa al momento.')
          );
        } else if (!q.trim()) {
          setSearchHint('Luoghi nell’area della mappa. Cerca un nome per filtrare.');
        } else if (data.warning) {
          setSearchHint(data.warning);
        }
      } catch {
        setResults([]);
        setSearchHint('Ricerca non disponibile al momento. Riprova tra poco.');
      } finally {
        setLoading(false);
      }
    },
    [destinationBounds, hasDestinations]
  );

  // Solo query / apertura: cambiare Attrazioni/Attività/Ristoranti NON ri-lancia la ricerca
  useEffect(() => {
    if (!open) return;
    void search(debounced);
  }, [debounced, open, search]);

  // Apertura modal: reset form + default orari
  useEffect(() => {
    if (!open) {
      setQuery('');
      setType('attraction');
      setDuration('1h');
      setStartTime('');
      setEndTime('');
      setPrice('');
      setResults([]);
      setSearchHint(null);
      return;
    }

    setQuery('');
    setType('attraction');
    setPrice('');
    // results caricati dall'effetto search con q vuota (area mappa)

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
                Luoghi popolari nell’area mappa (Google Places). Cerca un nome o scegli dalla lista.
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
            loading={loading}
            query={debounced}
            hint={searchHint}
            onAdd={addFromResult}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
