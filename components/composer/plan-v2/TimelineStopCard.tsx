'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BLOCK_META, getBlockDisplayTitle } from '@/lib/composer/blocks';
import type { ComposerBlock } from '@/types/composer';
import { Clock3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

type TimelineStopCardProps = {
  block: ComposerBlock;
  highlighted: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onHover: (hovering: boolean) => void;
};

function readTime(block: ComposerBlock): string {
  const time = block.content.time;
  if (typeof time === 'string' && time) return time;
  const slot = String(block.content.timeSlot ?? '');
  const map: Record<string, string> = {
    morning: '09:00',
    afternoon: '14:00',
    evening: '19:00',
    night: '22:00',
    flex: '—',
  };
  return map[slot] ?? '—';
}

export function TimelineStopCard({
  block,
  highlighted,
  onEdit,
  onRemove,
  onHover,
}: TimelineStopCardProps) {
  const meta = BLOCK_META[block.type];
  const title = getBlockDisplayTitle(block);
  const duration =
    typeof block.content.duration === 'string' ? block.content.duration : null;
  const place =
    typeof block.content.place === 'string' && block.content.place
      ? block.content.place
      : null;

  return (
    <div
      className={`plan-v2-stop-card group ${highlighted ? 'plan-v2-stop-card-active' : ''}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
          {meta.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{meta.label}</span>
            {duration && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {duration}
              </span>
            )}
            {place && <span className="truncate">{place}</span>}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <span className="hidden text-xs font-medium tabular-nums text-slate-400 sm:inline">
          {readTime(block)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Opzioni tappa"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemove} className="text-rose-600 focus:text-rose-600">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export { readTime };
