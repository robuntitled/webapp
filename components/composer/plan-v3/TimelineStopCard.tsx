'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BLOCK_META, getBlockDisplayTitle } from '@/lib/composer/blocks';
import type { ComposerBlock, ComposerBlockType } from '@/types/composer';
import {
  GripVertical,
  Heart,
  MoreHorizontal,
  Pencil,
  StickyNote,
  Ticket,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';

type TimelineStopCardProps = {
  block: ComposerBlock;
  highlighted: boolean;
  timeRange: string;
  transit?: { distanceKm: number; minutes: number };
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onHover: (hovering: boolean) => void;
  onToggleFavorite: () => void;
  onUpdateNotes: (notes: string) => void;
  onAddAttachment: (label: string, url: string) => void;
  onRemoveAttachment: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
};

const typeGradients: Record<ComposerBlockType, string> = {
  flight: 'from-sky-500/40 to-blue-600/20 border-sky-400/30',
  hotel: 'from-violet-500/40 to-purple-600/20 border-violet-400/30',
  attraction: 'from-amber-500/40 to-orange-600/20 border-amber-400/30',
  activity: 'from-emerald-500/40 to-teal-600/20 border-emerald-400/30',
  meal: 'from-rose-500/40 to-pink-600/20 border-rose-400/30',
  transport: 'from-slate-400/25 to-zinc-600/15 border-slate-400/20',
  free_time: 'from-yellow-500/30 to-amber-600/15 border-yellow-400/25',
  note: 'from-indigo-500/40 to-blue-600/20 border-indigo-400/30',
};

function attachmentsList(block: ComposerBlock): { id: string; label: string; url: string }[] {
  const raw = block.content.attachments;
  if (Array.isArray(raw)) return raw as { id: string; label: string; url: string }[];
  return [];
}

export function TimelineStopCard({
  block,
  highlighted,
  timeRange,
  transit,
  isFirst,
  isLast,
  onEdit,
  onRemove,
  onHover,
  onToggleFavorite,
  onUpdateNotes,
  onAddAttachment,
  onRemoveAttachment,
  dragHandleProps,
}: TimelineStopCardProps) {
  const meta = BLOCK_META[block.type];
  const title = getBlockDisplayTitle(block);
  const duration =
    typeof block.content.duration === 'string' ? block.content.duration : null;
  const place =
    typeof block.content.place === 'string' && block.content.place ? block.content.place : null;
  const isFavorite = Boolean(block.content.favorite);
  const notes = typeof block.content.notes === 'string' ? block.content.notes : '';
  const attachments = attachmentsList(block);
  const [showNotes, setShowNotes] = useState(false);
  const [attachLabel, setAttachLabel] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradient = typeGradients[block.type];

  return (
    <div className="relative">
      {!isFirst && (
        <div className="absolute -top-5 left-4 z-10 flex items-center gap-1 text-[10px] font-medium text-white/40">
          <span className="h-4 w-px bg-gradient-to-b from-transparent via-white/20 to-white/20" />
          {transit && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 backdrop-blur-sm">
              {transit.distanceKm < 1
                ? `${Math.round(transit.distanceKm * 1000)} m`
                : `${transit.distanceKm.toFixed(2)} km`}{' '}
              · {Math.round(transit.minutes)} min
            </span>
          )}
        </div>
      )}

      <div
        className={`composer-v3-stop-card group ${highlighted ? 'composer-v3-stop-card-active' : ''}`}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            {...dragHandleProps}
            className="mt-1 flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-white/30 transition hover:bg-white/10 hover:text-white/60 active:cursor-grabbing"
            aria-label="Riordina"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br text-lg ${gradient}`}
            >
              {meta.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                  {meta.label}
                </span>
                {duration && (
                  <span className="inline-flex items-center gap-1">
                    {duration}
                  </span>
                )}
                {place && <span className="truncate text-white/40">{place}</span>}
              </span>
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden text-xs font-semibold tabular-nums text-white/70 sm:inline">
            {timeRange}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              isFavorite ? 'text-rose-400' : 'text-white/30 hover:text-rose-300'
            }`}
            aria-label="Preferito"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowNotes((v) => !v);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              notes ? 'text-amber-300' : 'text-white/30 hover:text-white/60'
            }`}
            aria-label="Note"
          >
            <StickyNote className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                aria-label="Opzioni tappa"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border-white/10 bg-[#0f172a] text-white"
            >
              <DropdownMenuItem onClick={onEdit} className="focus:bg-white/10 focus:text-white">
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Modifica dettagli
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="focus:bg-white/10 focus:text-white"
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                Carica documento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowNotes((v) => !v)}
                className="focus:bg-white/10 focus:text-white"
              >
                <StickyNote className="mr-2 h-3.5 w-3.5" />
                {notes ? 'Modifica nota' : 'Aggiungi nota'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onRemove}
                className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showNotes && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <Textarea
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Note su questa tappa…"
            rows={2}
            className="resize-none rounded-xl border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus-visible:ring-amber-400/40"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNotes(false)}
              className="text-xs text-white/40 hover:text-white"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-400/30"
            >
              <Ticket className="h-3 w-3" />
              {a.label}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onRemoveAttachment(a.id);
                }}
                className="ml-1 text-sky-300/60 hover:text-sky-100"
              >
                <X className="h-3 w-3" />
              </button>
            </a>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          const label = file.name.length > 18 ? `${file.name.slice(0, 15)}…` : file.name;
          onAddAttachment(label, url);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export { attachmentsList };
