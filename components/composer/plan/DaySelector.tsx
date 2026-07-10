'use client';

import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { ComposerDay } from '@/types/composer';

const DAY_ACCENTS = [
  'bg-sky-500',
  'bg-orange-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-indigo-500',
];

type DaySelectorProps = {
  days: ComposerDay[];
  activeDayIndex: number;
  onSelect: (dayIndex: number) => void;
};

export function DaySelector({ days, activeDayIndex, onSelect }: DaySelectorProps) {
  return (
    <div className="relative">
      <div className="absolute top-1/2 left-4 right-4 h-px bg-white/10 -translate-y-1/2 hidden sm:block" />
      <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
        {days.map((day, i) => {
          const active = day.dayIndex === activeDayIndex;
          const hasBlocks = day.blocks.length > 0;
          const accent = DAY_ACCENTS[i % DAY_ACCENTS.length];
          const dateLabel = format(parseISO(day.date), 'EEE d', { locale: it });

          return (
            <motion.button
              key={day.dayIndex}
              type="button"
              onClick={() => onSelect(day.dayIndex)}
              whileTap={{ scale: 0.97 }}
              className={`composer-day-pill relative shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all duration-300 min-w-[88px] ${
                active
                  ? 'composer-day-pill-active'
                  : 'bg-white/[0.04] border border-white/8 hover:bg-white/[0.08] hover:border-white/15'
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${hasBlocks ? accent : 'bg-white/20'} ${
                  active ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-transparent' : ''
                }`}
              />
              <div className="text-center">
                <p className={`text-xs font-bold tabular-nums ${active ? 'text-white' : 'text-white/60'}`}>
                  Giorno {day.dayIndex}
                </p>
                <p className={`text-[10px] capitalize ${active ? 'text-accent/90' : 'text-white/35'}`}>
                  {dateLabel}
                </p>
              </div>
              {hasBlocks && (
                <span
                  className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    active ? 'bg-accent/20 text-accent' : 'bg-white/8 text-white/40'
                  }`}
                >
                  {day.blocks.length} {day.blocks.length === 1 ? 'blocco' : 'blocchi'}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}