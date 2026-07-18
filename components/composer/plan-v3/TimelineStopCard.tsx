'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BLOCK_META, getBlockDisplayTitle } from '@/lib/composer/blocks';
import type { ComposerBlock, ComposerBlockType } from '@/types/composer';
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  StickyNote,
  Ticket,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
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
  onUpdateNotes: (notes: string) => void;
  onAddAttachment: (label: string, url: string) => void;
  onRemoveAttachment: (id: string) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
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
  onEdit,
  onRemove,
  onHover,
  onUpdateNotes,
  onAddAttachment,
  onRemoveAttachment,
  dragHandleProps,
}: TimelineStopCardProps) {
  const meta = BLOCK_META[block.type];
  const title =
    block.type === 'hotel' && block.content.hotelPhase === 'checkout'
      ? `Check-out · ${getBlockDisplayTitle(block)}`
      : getBlockDisplayTitle(block);
  const duration =
    typeof block.content.duration === 'string' ? block.content.duration : null;
  const place =
    typeof block.content.place === 'string' && block.content.place ? block.content.place : null;
  const pickup =
    typeof block.content.pickupAddress === 'string' ? block.content.pickupAddress : null;
  const photoUrl =
    typeof block.content.photoUrl === 'string' && block.content.photoUrl
      ? block.content.photoUrl
      : null;
  const rating =
    typeof block.content.rating === 'number' ? block.content.rating : null;
  const ratingCount =
    typeof block.content.ratingCount === 'number' ? block.content.ratingCount : null;
  const notes = typeof block.content.notes === 'string' ? block.content.notes : '';
  const attachments = attachmentsList(block);
  const [showNotes, setShowNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);
  const [attachLabel, setAttachLabel] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ label: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradient = typeGradients[block.type];

  const saveNotes = () => {
    onUpdateNotes(draftNotes);
    setShowNotes(false);
  };

  const saveAttachment = () => {
    if (pendingFile) {
      onAddAttachment(pendingFile.label, pendingFile.url);
      setPendingFile(null);
      setAttachLabel('');
      setShowAttach(false);
      return;
    }
    if (attachLabel.trim()) {
      onAddAttachment(attachLabel.trim(), '#');
      setAttachLabel('');
      setShowAttach(false);
    }
  };

  return (
    <div className="relative">
      {!isFirst && transit && (
        <div className="absolute -top-5 left-4 z-10 flex items-center gap-1 text-[10px] font-medium text-white/40">
          <span className="rounded-full bg-white/5 px-2 py-0.5 backdrop-blur-sm">
            {transit.distanceKm < 1
              ? `${Math.round(transit.distanceKm * 1000)} m`
              : `${transit.distanceKm.toFixed(1)} km`}{' '}
            · {Math.round(transit.minutes)} min
          </span>
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

          <div className="flex min-w-0 flex-1 items-start gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br text-lg ${gradient}`}
              >
                {meta.emoji}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                  {meta.label}
                </span>
                {rating != null && (
                  <span className="font-semibold text-amber-300/90">
                    ★ {rating.toFixed(1)}
                    {ratingCount != null ? (
                      <span className="font-normal text-white/40"> ({ratingCount})</span>
                    ) : null}
                  </span>
                )}
                {duration && <span>{duration}</span>}
                {(pickup || place) && (
                  <span className="truncate text-white/40">{pickup ?? place}</span>
                )}
              </span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <span className="hidden text-xs font-semibold tabular-nums text-white/70 sm:inline mr-1">
            {timeRange}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-rose-500/15 hover:text-rose-300"
            aria-label="Elimina"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
                aria-label="Altre azioni"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 border-white/10 bg-[#0f172a] text-white"
            >
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="focus:bg-white/10 focus:text-white"
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                Carica documento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setDraftNotes(notes);
                  setShowNotes(true);
                }}
                className="focus:bg-white/10 focus:text-white"
              >
                <StickyNote className="mr-2 h-3.5 w-3.5" />
                Aggiungi nota
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showNotes && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <Textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="Note su questa tappa…"
            rows={2}
            className="resize-none rounded-xl border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus-visible:ring-amber-400/40"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/50"
              onClick={() => setShowNotes(false)}
            >
              Annulla
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={saveNotes}>
              Salva nota
            </Button>
          </div>
        </div>
      )}

      {showAttach && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <Input
            value={attachLabel}
            onChange={(e) => setAttachLabel(e.target.value)}
            placeholder="Nome documento"
            className="h-9 rounded-xl border-white/10 bg-white/5 text-sm text-white"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/50"
              onClick={() => {
                setShowAttach(false);
                setPendingFile(null);
              }}
            >
              Annulla
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={saveAttachment}>
              Salva documento
            </Button>
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
          const label = file.name.length > 24 ? `${file.name.slice(0, 20)}…` : file.name;
          setPendingFile({ label, url });
          setAttachLabel(label);
          setShowAttach(true);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export { attachmentsList };