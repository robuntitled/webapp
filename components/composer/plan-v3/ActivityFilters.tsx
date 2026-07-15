'use client';

import type { ComposerBlockType } from '@/types/composer';

export type ActivityTypeFilter = 'attraction' | 'meal' | 'activity' | 'transport';
export type DurationFilter = 'short' | 'medium' | 'long' | 'fullday' | 'any';

export const TYPE_FILTERS: { id: ActivityTypeFilter; label: string; blockType: ComposerBlockType }[] =
  [
    { id: 'attraction', label: 'Attrazioni', blockType: 'attraction' },
    { id: 'meal', label: 'Ristoranti', blockType: 'meal' },
    { id: 'activity', label: 'Attività', blockType: 'activity' },
    { id: 'transport', label: 'Trasporti', blockType: 'transport' },
  ];

export const DURATION_FILTERS: { id: DurationFilter; label: string; value?: string }[] = [
  { id: 'any', label: 'Qualsiasi' },
  { id: 'short', label: 'Breve (<1h)', value: '45m' },
  { id: 'medium', label: 'Media (1-2h)', value: '1h 30m' },
  { id: 'long', label: 'Lunga (2-4h)', value: '3h' },
  { id: 'fullday', label: 'Giornata intera', value: 'Giornata intera' },
];

type ActivityFiltersProps = {
  type: ActivityTypeFilter;
  duration: DurationFilter;
  startTime: string;
  notes: string;
  onTypeChange: (type: ActivityTypeFilter) => void;
  onDurationChange: (duration: DurationFilter) => void;
  onStartTimeChange: (time: string) => void;
  onNotesChange: (notes: string) => void;
};

export function ActivityFilters({
  type,
  duration,
  startTime,
  notes,
  onTypeChange,
  onDurationChange,
  onStartTimeChange,
  onNotesChange,
}: ActivityFiltersProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Tipo</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
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
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Durata</p>
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

      <div className="grid gap-3 sm:grid-cols-2">
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
        <label className="block space-y-1.5 sm:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Note personalizzate
          </span>
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Promemoria opzionale…"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15"
          />
        </label>
      </div>
    </div>
  );
}
