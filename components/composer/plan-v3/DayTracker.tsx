'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { LayoutGrid, Plus, X } from 'lucide-react';
import type { ComposerDay } from '@/types/composer';

export type DayTrackerSelection = number | 'overview';

type DayTrackerProps = {
  days: ComposerDay[];
  selection: DayTrackerSelection;
  onSelect: (selection: DayTrackerSelection) => void;
  onAddDay: () => void;
  onRemoveDay: (dayIndex: number) => void;
};

export function DayTracker({
  days,
  selection,
  onSelect,
  onAddDay,
  onRemoveDay,
}: DayTrackerProps) {
  const canRemove = days.length > 1;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onSelect('overview')}
        aria-pressed={selection === 'overview'}
        className={`composer-v3-day-pill ${selection === 'overview' ? 'composer-v3-day-pill-active' : ''}`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span>Overview</span>
      </button>

      <AnimatePresence initial={false} mode="popLayout">
        {days.map((day) => {
          const active = selection === day.dayIndex;
          const dateLabel = format(parseISO(day.date), 'd MMM', { locale: it });

          return (
            <motion.div
              key={day.dayIndex}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="relative group shrink-0"
            >
              <button
                type="button"
                onClick={() => onSelect(day.dayIndex)}
                aria-pressed={active}
                className={`composer-v3-day-pill ${active ? 'composer-v3-day-pill-active' : ''}`}
              >
                <span className="font-semibold">Giorno {day.dayIndex}</span>
                <span className="text-[10px] opacity-60 capitalize">{dateLabel}</span>
              </button>
              {canRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDay(day.dayIndex);
                  }}
                  aria-label={`Elimina giorno ${day.dayIndex}`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 shadow-lg shadow-rose-500/30 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <button
        type="button"
        onClick={onAddDay}
        aria-label="Aggiungi giorno"
        className="composer-v3-day-add"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
