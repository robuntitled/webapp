'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { BLOCK_META } from '@/lib/composer/blocks';
import type { ComposerBlockType } from '@/types/composer';

const PALETTE_TYPES: ComposerBlockType[] = [
  'flight',
  'hotel',
  'attraction',
  'activity',
  'meal',
  'transport',
  'free_time',
  'note',
];

type BlockPaletteProps = {
  onAdd: (type: ComposerBlockType) => void;
};

export function BlockPalette({ onAdd }: BlockPaletteProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
          Aggiungi al giorno
        </p>
        <Plus className="h-3.5 w-3.5 text-white/25" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {PALETTE_TYPES.map((type, i) => {
          const meta = BLOCK_META[type];
          return (
            <motion.button
              key={type}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onAdd(type)}
              className={`composer-palette-item shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl border bg-gradient-to-br ${meta.color} min-w-[76px]`}
              title={meta.hint}
            >
              <span className="text-2xl leading-none drop-shadow-sm">{meta.emoji}</span>
              <span className="text-[10px] font-medium text-white/75 leading-tight text-center">
                {meta.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}