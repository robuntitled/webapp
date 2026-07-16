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
  duration?: string;
};

type AddActivityModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ComposerDraft;
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
  onConfirm,
}: AddActivityModalProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ActivityTypeFilter>('attraction');
  const [duration, setDuration] = useState<DurationFilter>('1h');
  const [startTime, setStartTime] = useState('');
  const [results, setResults] = useState<ActivityResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(query, 320);

  const destinationBounds = useMemo(() => {
    const dests = getDraftDestinations(draft);
    return dests.map((d) => ({ lat: d.lat, lng: d.lng, radiusKm: 80 }));
  }, [draft]);

  const durationValue = DURATION_FILTERS.find((d) => d.id === duration)?.value ?? '1h';
  const blockType =
    TYPE_FILTERS.find((t) => t.id === type)?.blockType ?? 'attraction';

  const reset = () => {
    setQuery('');
    setType('attraction');
    setDuration('1h');
    setStartTime('');
    setResults([]);
  };

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2 || destinationBounds.length === 0) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/places/google-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q, bounds: destinationBounds }),
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
        };
        const center = destinationBounds[0];
        const mapped: ActivityResultItem[] = (data.results ?? []).map((p) => ({
          id: p.id,
          title: p.label,
          subtitle: p.subtitle || p.placeTypeLabel,
          category: p.placeTypeLabel,
          lat: p.lat,
          lng: p.lng,
          distanceKm: haversineKm(center, { lat: p.lat, lng: p.lng }),
        }));
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [destinationBounds]
  );

  useEffect(() => {
    if (!open) return;
    void search(debounced);
  }, [debounced, open, search]);

  useEffect(() => {
    if (!open) reset();
  }, [open]);

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
      duration: durationValue,
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
                Cerca luoghi nelle tue destinazioni tramite Google Maps.
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
              placeholder="Cerca musei, ristoranti, attrazioni…"
              className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/15"
            />
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b border-white/10 px-5 py-4 md:px-7">
          <ActivityFilters
            type={type}
            duration={duration}
            startTime={startTime}
            onTypeChange={setType}
            onDurationChange={setDuration}
            onStartTimeChange={setStartTime}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-7">
          <ActivityResultsList
            items={results}
            loading={loading}
            query={query}
            onAdd={addFromResult}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}