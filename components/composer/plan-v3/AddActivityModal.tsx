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
  endTimeFromStartAndDuration,
  type DurationFilter,
} from '@/components/composer/plan-v3/ActivityFilters';
import { ActivityResultsList } from '@/components/composer/plan-v3/ActivityResultsList';
import type { ActivityResultItem } from '@/components/composer/plan-v3/ActivityResultCard';
import { getDraftDestinations } from '@/lib/composer/draft-destinations';
import {
  findTimeOverlapConflict,
  getDefaultTimeSlotForNewBlock,
} from '@/lib/composer/day-time-schedule';
import { toast } from 'sonner';
import {
  getPlaceCategory,
  type PlaceCategoryId,
} from '@/lib/places/place-categories';
import {
  boundsCacheKey,
  fetchPlacesForComposer,
  getCachedPlaces,
  MIN_SEARCH_CHARS,
  placesCacheKey,
} from '@/lib/places/places-search-client';
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
  const [category, setCategory] = useState<PlaceCategoryId>('attraction');
  const [duration, setDuration] = useState<DurationFilter>('1h');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [results, setResults] = useState<ActivityResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  // Debounce più alto → meno chiamate mentre digiti
  const debounced = useDebounced(query, query.trim() ? 350 : 0);
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
  const cacheKeyBase = useMemo(
    () => boundsCacheKey(destinationBounds),
    [destinationBounds]
  );

  const categoryMeta = getPlaceCategory(category);
  const durationValue = DURATION_FILTERS.find((d) => d.id === duration)?.value ?? '1h';
  const blockType = categoryMeta.blockType;

  const handleDurationChange = (next: DurationFilter) => {
    setDuration(next);
    if (startTime) setEndTime(endTimeFromStartAndDuration(startTime, next));
  };

  const handleStartTimeChange = (next: string) => {
    setStartTime(next);
    if (next) setEndTime(endTimeFromStartAndDuration(next, duration));
  };

  const search = useCallback(
    async (q: string, cat: PlaceCategoryId) => {
      if (!hasDestinations) {
        setResults([]);
        setSearchHint(
          'Nessuna destinazione nel viaggio. Torna allo step precedente e seleziona almeno una meta.'
        );
        return;
      }

      const trimmed = q.trim();

      // 1–2 caratteri: non chiamare Google, tieni lista categoria se c’è
      if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_CHARS) {
        setSearchHint(`Digita almeno ${MIN_SEARCH_CHARS} caratteri per cercare…`);
        setLoading(false);
        return;
      }

      const cacheKey = placesCacheKey(cacheKeyBase, cat, trimmed);
      const hit = getCachedPlaces(cacheKey);
      if (hit) {
        setResults(hit);
        const label = getPlaceCategory(cat).label;
        setSearchHint(trimmed ? null : `${label} nell’area mappa`);
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
        const { items, warning } = await fetchPlacesForComposer({
          q: trimmed,
          category: cat,
          bounds: destinationBounds,
          signal: ac.signal,
        });
        if (myId !== reqId.current) return;

        setResults(items);
        const catLabel = getPlaceCategory(cat).label;
        if (items.length === 0) {
          setSearchHint(
            warning ??
              (trimmed
                ? `Nessun risultato in «${catLabel}». Prova un altro termine.`
                : `Nessun luogo «${catLabel}» nell’area al momento.`)
          );
        } else if (!trimmed) {
          setSearchHint(`${catLabel} nell’area mappa`);
        } else {
          setSearchHint(null);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        if (myId !== reqId.current) return;
        setResults([]);
        setSearchHint(
          e instanceof Error ? e.message : 'Ricerca non disponibile al momento.'
        );
      } finally {
        if (myId === reqId.current) setLoading(false);
      }
    },
    [cacheKeyBase, destinationBounds, hasDestinations]
  );

  useEffect(() => {
    if (!open) return;
    void search(debounced, category);
  }, [debounced, category, open, search]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setQuery('');
      setCategory('attraction');
      setDuration('1h');
      setStartTime('');
      setEndTime('');
      setPrice('');
      setSearchHint(null);
      return;
    }

    setQuery('');
    setCategory('attraction');
    setPrice('');

    // Prefetch / cache: mostra subito Attrazioni se già caricate
    const nearbyKey = placesCacheKey(cacheKeyBase, 'attraction', '');
    const hit = getCachedPlaces(nearbyKey);
    if (hit) {
      setResults(hit);
      setSearchHint('Attrazioni nell’area mappa');
    }

    // Orari in sequenza: prima 08–09, poi subito dopo l’ultima (09–10, …)
    const day = draft.days.find((d) => d.dayIndex === activeDayIndex);
    const slot = getDefaultTimeSlotForNewBlock(day?.blocks ?? [], 60);
    setDuration('1h');
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const parsedPrice = price.trim() ? Number(price.replace(',', '.')) : null;

  const activeDayBlocks = useMemo(() => {
    return draft.days.find((d) => d.dayIndex === activeDayIndex)?.blocks ?? [];
  }, [draft.days, activeDayIndex]);

  const confirm = (payload: AddActivityPayload) => {
    if (payload.time && payload.endTime) {
      const conflict = findTimeOverlapConflict(activeDayBlocks, {
        startTime: payload.time,
        endTime: payload.endTime,
        type: payload.type,
      });
      if (conflict) {
        toast.error(conflict.message);
        return;
      }
    }
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
        className="composer-v3-modal flex h-[min(92dvh,880px)] w-[min(96vw,920px)] max-w-none flex-col gap-0 overflow-visible rounded-3xl border-white/10 bg-[#0b1120] p-0 shadow-2xl sm:overflow-hidden"
      >
        <DialogHeader className="shrink-0 space-y-3 border-b border-white/10 bg-[#0f172a] px-5 py-4 text-left md:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-display text-xl text-white">Aggiungi</DialogTitle>
              <DialogDescription className="text-sm text-white/50">
                Categoria + area mappa. Digita almeno {MIN_SEARCH_CHARS} caratteri per cercare.
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
              placeholder={categoryMeta.searchPlaceholder}
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/15"
            />
          </div>
        </DialogHeader>

        <div className="relative z-20 shrink-0 space-y-3 border-b border-white/10 px-5 py-4 md:px-7">
          <ActivityFilters
            type={category}
            duration={duration}
            startTime={startTime}
            endTime={endTime}
            onTypeChange={setCategory}
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
