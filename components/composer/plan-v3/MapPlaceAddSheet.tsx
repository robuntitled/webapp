'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DURATION_FILTERS,
  MEAL_DURATION_FILTERS,
  endTimeFromStartAndDuration,
  type DurationFilter,
} from '@/components/composer/plan-v3/ActivityFilters';
import { QuarterHourTimeSelect } from '@/components/composer/plan-v3/QuarterHourTimeSelect';
import {
  findTimeOverlapConflict,
  getDefaultTimeSlotForNewBlock,
} from '@/lib/composer/day-time-schedule';
import { PLACE_CATEGORIES, type PlaceCategoryId } from '@/lib/places/place-categories';
import type { ComposerBlock, ComposerBlockType } from '@/types/composer';
import { toast } from 'sonner';
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
  /** Blocchi del giorno attivo — per orari in sequenza e anti-sovrapposizione */
  dayBlocks?: ComposerBlock[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: MapPlaceAddPayload) => void;
};

function guessCategory(primaryType?: string | null): PlaceCategoryId {
  const t = (primaryType || '').toLowerCase();
  if (/restaurant|cafe|bar|bakery|meal|food/.test(t)) return 'meal';
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
  dayBlocks = [],
  onOpenChange,
  onConfirm,
}: MapPlaceAddSheetProps) {
  const [duration, setDuration] = useState<DurationFilter>('1h');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');

  // Categoria fissa dal tipo Google — non modificabile in UI
  const category = useMemo(
    () => guessCategory(place?.primaryType),
    [place?.primaryType]
  );
  const categoryLabel =
    PLACE_CATEGORIES.find((c) => c.id === category)?.label ?? 'Attrazioni';
  const blockType =
    PLACE_CATEGORIES.find((c) => c.id === category)?.blockType ?? 'attraction';

  useEffect(() => {
    if (!open || !place) return;
    setTitle(place.name === '…' ? '' : place.name);
    const slot = getDefaultTimeSlotForNewBlock(dayBlocks, 60);
    setDuration('1h');
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
  }, [open, place?.placeId, place?.name, dayBlocks]);

  const handleDuration = (d: DurationFilter) => {
    setDuration(d);
    if (startTime) setEndTime(endTimeFromStartAndDuration(startTime, d));
  };

  const handleStart = (t: string) => {
    setStartTime(t);
    if (t) setEndTime(endTimeFromStartAndDuration(t, duration));
  };

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
        className="max-h-[min(92dvh,720px)] max-w-md gap-0 overflow-y-auto overflow-x-visible rounded-3xl border-white/10 bg-[#0b1120] p-0 text-white"
      >
        {/* a11y: titolo nascosto (niente header “Aggiungi / Luogo dalla mappa…”) */}
        <DialogTitle className="sr-only">
          {place?.name && place.name !== '…' ? place.name : 'Aggiungi luogo'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Aggiungi questo luogo al piano di viaggio
        </DialogDescription>

        {/* Foto + rating */}
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
          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          {loading && !place?.name?.trim() && (
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

              {/* Categoria fissa dal POI — non modificabile */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Categoria
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  {categoryLabel}
                </span>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Durata
                </p>
                <div className="flex flex-wrap gap-2">
                  {(category === 'meal' ? MEAL_DURATION_FILTERS : DURATION_FILTERS).map((f) => (
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

              <div className="relative z-30 grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Inizio
                  </span>
                  <QuarterHourTimeSelect value={startTime} onChange={handleStart} />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Fine
                  </span>
                  <QuarterHourTimeSelect value={endTime} onChange={setEndTime} />
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
                    if (startTime && endTime) {
                      const conflict = findTimeOverlapConflict(dayBlocks, {
                        startTime,
                        endTime,
                        type: blockType,
                      });
                      if (conflict) {
                        toast.error(conflict.message);
                        return;
                      }
                    }
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
