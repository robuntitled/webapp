'use client';

import { motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GripVertical,
  Pencil,
} from 'lucide-react';
import {
  BLOCK_META,
  getBlockDisplayPrice,
  getBlockDisplayTitle,
} from '@/lib/composer/blocks';
import { getBlockSubtitle } from '@/lib/composer/planning';
import { getTimeSlotEmoji, getTimeSlotLabel } from '@/lib/composer/time-slots';
import type { ComposerBlock } from '@/types/composer';

type BlockCardProps = {
  block: ComposerBlock;
  index: number;
  total: number;
  isHighlighted: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onHover: (hovering: boolean) => void;
  onDragReorder: (fromIndex: number, toIndex: number) => void;
};

export function BlockCard({
  block,
  index,
  total,
  isHighlighted,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onHover,
  onDragReorder,
}: BlockCardProps) {
  const meta = BLOCK_META[block.type];
  const price = getBlockDisplayPrice(block);
  const subtitle = getBlockSubtitle(block);
  const timeSlot = String(block.content.timeSlot ?? 'flex');
  const duration = typeof block.content.duration === 'string' ? block.content.duration : null;
  const affiliateUrl =
    typeof block.content.affiliateUrl === 'string' ? block.content.affiliateUrl : null;
  const altCount = block.alternatives.length;

  return (
    <motion.div
      layout
      layoutId={block.id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        if (!Number.isNaN(from) && from !== index) onDragReorder(from, index);
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`composer-block-card-pro group relative cursor-pointer rounded-2xl border bg-gradient-to-br ${meta.color} overflow-hidden transition-all duration-300 ${
        isHighlighted ? 'composer-block-card-highlighted' : ''
      }`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white/30 to-transparent" />

      <div className="flex gap-3 p-4" onClick={onEdit}>
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('text/plain', String(index));
            e.dataTransfer.effectAllowed = 'move';
          }}
          className="flex flex-col items-center gap-1 shrink-0 pt-1 opacity-40 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-white/50 pointer-events-none" />
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg">
          {meta.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/35 bg-white/8 px-2 py-0.5 rounded-full">
              {meta.label}
            </span>
            <span className="text-[9px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
              {getTimeSlotEmoji(timeSlot)} {getTimeSlotLabel(timeSlot)}
            </span>
            {duration && (
              <span className="text-[9px] text-white/35 px-2 py-0.5 rounded-full border border-white/8">
                {duration}
              </span>
            )}
            {altCount > 0 && (
              <span className="text-[9px] text-accent/80 px-2 py-0.5 rounded-full bg-accent/10">
                +{altCount} alt.
              </span>
            )}
          </div>

          <p className="font-semibold text-white text-base leading-tight truncate">
            {getBlockDisplayTitle(block)}
          </p>
          {subtitle && (
            <p className="text-xs text-white/45 truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        {price != null && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold tabular-nums text-accent">{price}€</p>
            <p className="text-[9px] text-white/30">stima</p>
          </div>
        )}
      </div>

      <div
        className="flex items-center gap-1 px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" disabled={index === 0} onClick={onMoveUp} className="composer-icon-btn" aria-label="Su">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" disabled={index === total - 1} onClick={onMoveDown} className="composer-icon-btn" aria-label="Giù">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onDuplicate} className="composer-icon-btn" aria-label="Duplica">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onEdit} className="composer-icon-btn" aria-label="Modifica">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {affiliateUrl && (
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="composer-icon-btn ml-auto text-accent hover:bg-accent/15"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}