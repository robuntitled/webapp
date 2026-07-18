'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DURATION_FILTERS,
  endTimeFromStartAndDuration,
  type DurationFilter,
} from '@/components/composer/plan-v3/ActivityFilters';
import { PLACE_CATEGORIES, type PlaceCategoryId } from '@/lib/places/place-categories';
import type { ComposerBlockType } from '@/types/composer';
import { Loader2, MapPin, Star, X } from 'lucide-react';

export type MapPlacePreview = {
  placeId?: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  rating?: number | null;
  ratingCount?: number | null;
  photoUrl?: string | null;
  primaryType?: string | null;
};

export type MapPlaceAddPayload = {
  type: ComposerBlockType;
  title: string;
  place?: string;
  lat: number;
  lng: number;
  time?: string;
  endTime?: string;
  duration?: string;
  price?: number | null;
};

type MapPlaceAddSheetProps = {
  open: boolean;
  place: MapPlacePreview | null;
  loading?: boolean;
  error?: string | null;
  isFirstOfDay?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: MapPlaceAddPayload) => void;
};

function guessCategory(primaryType?: string | null): PlaceCategoryId {
  const t = (primaryType || '').toLowerCase();
  if (
    /restaurant|cafe|bar|bakery|meal|food/.test(t)
  ) {
    return 'meal';
  }
  if (/lodging|hotel/.test(t)) return 'hotel';
  if (/spa|gym|stadium|amusement|night_club|movie|bowling|marina|casino/.test(t)) {
    return 'activity';
  }
  if (/shop|store|mall|market/.test(t)) return 'shopping';
  return 'attraction';
}

export function MapPlaceAddSheet({
  open,
  place,
  loading,
  error,
  isFirstOfDay,
  onOpenChange,
  onConfirm,
}: MapPlaceAddSheetProps) {
  const [category, setCategory] = useState<PlaceCategoryId>('attraction');
  const [duration, setDuration] = useState<DurationFilter>('1h');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!open || !place) return;
    setTitle(place.name);
    setCategory(guessCategory(place.primaryType));
    if (isFirstOfDay) {
      setDuration('1h');
      setStartTime('08:00');
      setEndTime('09:00');
    } else {
      setDuration('1h');
      setStartTime('');
      setEndTime('');
    }
  }, [open, place?.placeId, place?.name, isFirstOfDay]);

  const handleDuration = (d: DurationFilter) => {
    setDuration(d);
    if (startTime) setEndTime(endTimeFromStartAndDuration(startTime, d));
  };

  const handleStart = (t: string) => {
    setStartTime(t);
    if (t) setEndTime(endTimeFromStartAndDuration(t, duration));
  };

  const blockType =
    PLACE_CATEGORIES.find((c) => c.id === category)?.blockType ?? 'attraction';
  const durationValue =
    DURATION_FILTERS.find((d) => d.id === duration)?.value ?? '1h';

  const canAdd =
    Boolean(place) &&
    !loading &&
    !error &&
    title.trim().length > 0 &&
    Number.isFinite(place?.lat) &&
    Number.isFinite(place?.lng);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-3xl border-white/10 bg-[#0b1120] p-0 text-white"
      >
        {/* Foto */}
        <div className="relative h-44 w-full bg-white/5">
          {place?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={place.photoUrl}
              alt={place.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/30">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <MapPin className="h-10 w-10" />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur hover:bg-black/70"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
          {place?.rating != null && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{place.rating.toFixed(1)}</span>
              {place.ratingCount != null && (
                <span className="font-normal text-white/60">
                  ({place.ratingCount})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-display text-xl text-white">Aggiungi</DialogTitle>
            <DialogDescription className="text-sm text-white/50">
              Luogo dalla mappa · titolo già compilato
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          {loading && !place && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carico dettagli…
            </div>
          )}

          {place && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Titolo
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-400/50"
                />
                {place.address && (
                  <p className="text-xs text-white/40">{place.address}</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Categoria
                </p>
                <div className="flex flex-wrap gap-2">
                  {PLACE_CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        category === c.id
                          ? 'bg-gradient-to-r from-violet-600 to-orange-500 text-white'
                          : 'bg-white/5 text-white/65 hover:bg-white/10'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Durata
                </p>
                <div className="flex flex-wrap gap-2">
                  {DURATION_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleDuration(f.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        duration === f.id
                          ? 'bg-white/15 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Inizio
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleStart(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-400/50"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Fine
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-amber-400/50"
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 rounded-full border border-white/15 text-white hover:bg-white/10"
                  onClick={() => onOpenChange(false)}
                >
                  Indietro
                </Button>
                <Button
                  type="button"
                  disabled={!canAdd}
                  className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-white disabled:opacity-40"
                  onClick={() => {
                    if (!place || !canAdd) return;
                    onConfirm({
                      type: blockType,
                      title: title.trim(),
                      place: place.address || undefined,
                      lat: place.lat,
                      lng: place.lng,
                      time: startTime || undefined,
                      endTime: endTime || undefined,
                      duration: durationValue,
                    });
                  }}
                >
                  Aggiungi
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
