'use client';

import {
  PLACE_CATEGORIES,
  type PlaceCategoryId,
} from '@/lib/places/place-categories';
import type { ComposerBlockType } from '@/types/composer';

/** @deprecated usa PlaceCategoryId — alias per compat */
export type ActivityTypeFilter = PlaceCategoryId;

export type DurationFilter = '30m' | '1h' | '2h' | '4h' | '6h' | 'fullday';

/** Compat: bottoni categoria da config Google Places */
export const TYPE_FILTERS: {
  id: PlaceCategoryId;
  label: string;
  blockType: ComposerBlockType;
}[] = PLACE_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
  blockType: c.blockType,
}));

export const DURATION_FILTERS: { id: DurationFilter; label: string; value: string }[] = [
  { id: '30m', label: '30 min', value: '30m' },
  { id: '1h', label: '1 ora', value: '1h' },
  { id: '2h', label: '2 ore', value: '2h' },
  { id: '4h', label: '4 ore', value: '4h' },
  { id: '6h', label: '6 ore', value: '6h' },
  { id: 'fullday', label: 'Intera giornata', value: 'Giornata intera' },
];

export const DURATION_MINUTES: Record<DurationFilter, number> = {
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '4h': 240,
  '6h': 360,
  fullday: 480,
};

export function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.trim().split(':');
  if (parts.length < 2) return '';
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function endTimeFromStartAndDuration(
  startTime: string,
  duration: DurationFilter
): string {
  if (!startTime) return '';
  return addMinutesToTime(startTime, DURATION_MINUTES[duration]);
}

type ActivityFiltersProps = {
  type: PlaceCategoryId;
  duration: DurationFilter;
  startTime: string;
  endTime: string;
  onTypeChange: (type: PlaceCategoryId) => void;
  onDurationChange: (duration: DurationFilter) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
};

export function ActivityFilters({
  type,
  duration,
  startTime,
  endTime,
  onTypeChange,
  onDurationChange,
  onStartTimeChange,
  onEndTimeChange,
}: ActivityFiltersProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Categoria
        </p>
        <p className="mb-2 text-[11px] text-white/35">
          Filtra i luoghi Google Places nell’area (e imposta il tipo di tappa).
        </p>
        <div className="flex flex-wrap gap-2">
          {PLACE_CATEGORIES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onTypeChange(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                type === f.id
                  ? 'bg-gradient-to-r from-violet-600 to-orange-500 text-white shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {f.label}
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
              onClick={() => onDurationChange(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                duration === f.id
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid max-w-md grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Orario inizio
          </span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Orario fine
          </span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15"
          />
        </label>
      </div>
    </div>
  );
}
