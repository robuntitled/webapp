'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus, X } from 'lucide-react';
import type { ComposerDay } from '@/types/composer';

type DayTrackerProps = {
  days: ComposerDay[];
  activeDayIndex: number;
  onSelect: (dayIndex: number) => void;
  onAddDay: () => void;
  onRemoveDay: (dayIndex: number) => void;
};

export function DayTracker({
  days,
  activeDayIndex,
  onSelect,
  onAddDay,
  onRemoveDay,
}: DayTrackerProps) {
  const canRemove = days.length > 1;

  return (
    <div className="composer-day-tracker">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <AnimatePresence initial={false} mode="popLayout">
          {days.map((day) => {
            const active = day.dayIndex === activeDayIndex;
            const dateLabel = format(parseISO(day.date), 'EEE d MMM', { locale: it });

            return (
              <motion.div
                key={day.dayIndex}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group shrink-0"
              >
                <button
                  type="button"
                  onClick={() => onSelect(day.dayIndex)}
                  aria-pressed={active}
                  className={`composer-day-track-pill ${
                    active ? 'composer-day-track-pill-active' : ''
                  }`}
                >
                  <span className="text-[11px] font-bold tracking-wide">
                    Giorno {day.dayIndex}
                  </span>
                  <span
                    className={`text-[10px] capitalize ${
                      active ? 'text-accent/90' : 'text-white/35'
                    }`}
                  >
                    {dateLabel}
                  </span>
                  {day.blocks.length > 0 && (
                    <span className="composer-day-track-count">{day.blocks.length}</span>
                  )}
                </button>

                {canRemove && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveDay(day.dayIndex);
                    }}
                    aria-label={`Elimina giorno ${day.dayIndex}`}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/90 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-lg shadow-rose-500/30 hover:bg-rose-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        <motion.button
          layout
          type="button"
          onClick={onAddDay}
          whileTap={{ scale: 0.96 }}
          aria-label="Aggiungi giorno"
          className="composer-day-track-add shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[10px] font-semibold">Giorno</span>
        </motion.button>
      </div>
    </div>
  );
}
