'use client';

import { motion } from 'framer-motion';
import { BLOCK_CATEGORIES, BLOCK_META } from '@/lib/composer/blocks';
import type { ComposerBlockType } from '@/types/composer';
import type { TimeSlot } from '@/lib/composer/time-slots';
import { TIME_SLOTS } from '@/lib/composer/time-slots';

type BlockPaletteProps = {
  selectedSlot: TimeSlot;
  onSlotChange: (slot: TimeSlot) => void;
  onAdd: (type: ComposerBlockType, timeSlot: TimeSlot) => void;
};

export function BlockPalette({ selectedSlot, onSlotChange, onAdd }: BlockPaletteProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {TIME_SLOTS.map((slot) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSlotChange(slot.id)}
            className={`composer-time-chip shrink-0 ${
              selectedSlot === slot.id ? 'composer-time-chip-active' : ''
            }`}
          >
            <span>{slot.emoji}</span>
            <span>{slot.label}</span>
            <span className="text-[9px] opacity-50">{slot.hours}</span>
          </button>
        ))}
      </div>

      {BLOCK_CATEGORIES.map((cat) => (
        <div key={cat.id}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2 px-0.5">
            {cat.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {cat.types.map((type, i) => {
              const meta = BLOCK_META[type];
              return (
                <motion.button
                  key={type}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onAdd(type, selectedSlot)}
                  className={`composer-palette-item flex items-center gap-2 px-3 py-2 rounded-xl border bg-gradient-to-br ${meta.color}`}
                  title={meta.hint}
                >
                  <span className="text-lg">{meta.emoji}</span>
                  <span className="text-xs font-medium text-white/85">{meta.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}