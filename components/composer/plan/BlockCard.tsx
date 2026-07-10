'use client';

import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { BLOCK_META, getBlockDisplayPrice, getBlockDisplayTitle } from '@/lib/composer/blocks';
import type { ComposerBlock } from '@/types/composer';

type BlockCardProps = {
  block: ComposerBlock;
  index: number;
  total: number;
  isHighlighted: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onHover: (hovering: boolean) => void;
};

export function BlockCard({
  block,
  index,
  total,
  isHighlighted,
  onEdit,
  onMoveUp,
  onMoveDown,
  onHover,
}: BlockCardProps) {
  const meta = BLOCK_META[block.type];
  const price = getBlockDisplayPrice(block);
  const altCount = block.alternatives.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onEdit}
      className={`composer-block-card group relative flex gap-4 cursor-pointer rounded-2xl border bg-gradient-to-br ${meta.color} p-4 transition-all duration-300 ${
        isHighlighted ? 'composer-block-card-highlighted' : ''
      }`}
    >
      <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
        <div className="composer-timeline-dot" />
        {index < total - 1 && <div className="composer-timeline-line flex-1 min-h-[24px]" />}
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl shadow-inner">
        {meta.emoji}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              {meta.label}
              {altCount > 0 && (
                <span className="ml-1.5 text-accent/70">+{altCount} alt.</span>
              )}
            </p>
            <p className="font-semibold text-white truncate mt-0.5">
              {getBlockDisplayTitle(block)}
            </p>
          </div>
          {price != null && (
            <span className="shrink-0 text-sm font-bold tabular-nums text-accent bg-accent/15 px-2.5 py-1 rounded-full">
              {price}€
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="composer-icon-btn"
            aria-label="Sposta su"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="composer-icon-btn"
            aria-label="Sposta giù"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onEdit} className="composer-icon-btn ml-auto" aria-label="Modifica">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}