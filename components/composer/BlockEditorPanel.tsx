'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, RefreshCw, Trash2, ExternalLink, X, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { BLOCK_META, createAlternativeId, DURATION_OPTIONS } from '@/lib/composer/blocks';
import {
  DURATION_FILTERS,
  endTimeFromStartAndDuration,
  type DurationFilter,
} from '@/components/composer/plan-v3/ActivityFilters';
import { findTimeOverlapConflict } from '@/lib/composer/day-time-schedule';
import { hasTravelpayoutsEmbed } from '@/lib/travelpayouts/public-config';
import { TIME_SLOTS } from '@/lib/composer/time-slots';
import type { ComposerBlock, ComposerDraft } from '@/types/composer';

const TRANSPORT_MODES = [
  { id: 'taxi', label: 'Taxi' },
  { id: 'bus', label: 'Bus' },
  { id: 'train', label: 'Treno' },
  { id: 'metro', label: 'Metro' },
  { id: 'walk', label: 'A piedi' },
  { id: 'rental', label: 'Noleggio' },
  { id: 'ferry', label: 'Traghetto' },
];

const TRAVEL_CLASSES = [
  { id: 'economy', label: 'Economy' },
  { id: 'comfort', label: 'Premium' },
  { id: 'business', label: 'Business' },
];

const PLACE_BLOCK_TYPES = new Set(['attraction', 'activity', 'meal']);

function matchDurationFilter(duration: unknown): DurationFilter {
  const v = String(duration ?? '1h');
  if (v === '30m' || v === '1h' || v === '2h' || v === '4h' || v === '6h') return v;
  if (v === 'Giornata intera' || v === 'fullday' || v === 'Mezza giornata') return 'fullday';
  if (v.includes('30')) return '30m';
  if (v.startsWith('2')) return '2h';
  if (v.startsWith('4')) return '4h';
  if (v.startsWith('6')) return '6h';
  return '1h';
}

/** Blocco non ancora confermato (es. creato ma da finalizzare) */
function isPendingAdd(block: ComposerBlock): boolean {
  return block.content.pendingAdd === true;
}

type BlockEditorPanelProps = {
  block: ComposerBlock | null;
  draft: ComposerDraft;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (blockId: string, updater: (block: ComposerBlock) => ComposerBlock) => void;
  onRemove: (blockId: string) => void;
};

export function BlockEditorPanel({
  block,
  draft,
  open,
  onOpenChange,
  onUpdate,
  onRemove,
}: BlockEditorPanelProps) {
  const [flightLoading, setFlightLoading] = useState(false);
  const [affiliateUrl, setAffiliateUrl] = useState<string | null>(null);
  const embedOnly = hasTravelpayoutsEmbed();
  const [showAltForm, setShowAltForm] = useState(false);
  const [altLabel, setAltLabel] = useState('');
  const [altPrice, setAltPrice] = useState('');

  // Orari locali (allineati ad Aggiungi) per attraction/activity/meal
  const [duration, setDuration] = useState<DurationFilter>('1h');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [priceDraft, setPriceDraft] = useState('');

  useEffect(() => {
    if (embedOnly || !open || !block || (block.type !== 'flight' && block.type !== 'hotel')) {
      setAffiliateUrl(null);
      return;
    }

    const existing =
      typeof block.content.affiliateUrl === 'string' ? block.content.affiliateUrl : null;
    if (existing) {
      setAffiliateUrl(existing);
      return;
    }

    const params = new URLSearchParams({
      destination: draft.destination,
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
    if (draft.organizerOrigin?.iata) {
      params.set('origin', draft.organizerOrigin.iata);
    }

    void fetch(`/api/travel/links?${params}`)
      .then((r) => r.json())
      .then((data: { flightUrl?: string; hotelUrl?: string }) => {
        const url = block.type === 'flight' ? data.flightUrl : data.hotelUrl;
        if (url) {
          setAffiliateUrl(url);
          onUpdate(block.id, (b) => ({
            ...b,
            content: { ...b.content, affiliateUrl: url },
          }));
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, block?.id, block?.type, draft.destination, draft.startDate, draft.endDate]);

  useEffect(() => {
    if (!open || !block) return;
    setShowAltForm(false);
    setAltLabel('');
    setAltPrice('');

    // Sync orari/titolo da blocco
    const d = matchDurationFilter(block.content.duration);
    setDuration(d);
    const start = typeof block.content.time === 'string' ? block.content.time : '';
    const end = typeof block.content.endTime === 'string' ? block.content.endTime : '';
    setStartTime(start);
    setEndTime(
      end || (start ? endTimeFromStartAndDuration(start, d) : '')
    );
    setTitleDraft(String(block.content.title ?? ''));
    setPriceDraft(
      block.content.price != null && block.content.price !== ''
        ? String(block.content.price)
        : ''
    );
  }, [open, block?.id]);

  if (!block) return null;

  const meta = BLOCK_META[block.type];
  const isPlaceBlock = PLACE_BLOCK_TYPES.has(block.type);
  const pendingAdd = isPendingAdd(block);
  // Aggiungi = da finalizzare; Modifica = già nel piano
  const isAddMode = pendingAdd;
  const dialogTitle = isPlaceBlock
    ? isAddMode
      ? 'Aggiungi'
      : 'Modifica'
    : `Modifica ${meta.label}`;

  const patchContent = (patch: Record<string, unknown>) => {
    onUpdate(block.id, (b) => ({
      ...b,
      content: { ...b.content, ...patch },
    }));
  };

  const handleDurationChange = (next: DurationFilter) => {
    setDuration(next);
    const value = DURATION_FILTERS.find((f) => f.id === next)?.value ?? next;
    const nextEnd = startTime ? endTimeFromStartAndDuration(startTime, next) : endTime;
    setEndTime(nextEnd);
    patchContent({
      duration: value,
      ...(nextEnd ? { endTime: nextEnd } : {}),
    });
  };

  const handleStartTimeChange = (next: string) => {
    setStartTime(next);
    const nextEnd = next ? endTimeFromStartAndDuration(next, duration) : '';
    setEndTime(nextEnd);
    patchContent({
      time: next || undefined,
      endTime: nextEnd || undefined,
    });
  };

  const handleEndTimeChange = (next: string) => {
    setEndTime(next);
    patchContent({ endTime: next || undefined });
  };

  const dayBlocksForOverlap =
    draft.days.find((d) => d.blocks.some((b) => b.id === block.id))?.blocks ?? [];

  const validateTimesOrToast = (): boolean => {
    if (!startTime || !endTime) return true;
    const conflict = findTimeOverlapConflict(dayBlocksForOverlap, {
      startTime,
      endTime,
      type: block.type,
      excludeBlockId: block.id,
    });
    if (conflict) {
      toast.error(conflict.message);
      return false;
    }
    return true;
  };

  const commitPlaceFields = () => {
    const price = priceDraft.trim() ? Number(priceDraft.replace(',', '.')) : null;
    const durationValue = DURATION_FILTERS.find((f) => f.id === duration)?.value ?? duration;
    patchContent({
      title: titleDraft.trim() || block.content.title,
      time: startTime || undefined,
      endTime: endTime || undefined,
      duration: durationValue,
      price: Number.isFinite(price) ? price : null,
      pendingAdd: false,
    });
  };

  const handleAddConfirm = () => {
    if (!validateTimesOrToast()) return;
    commitPlaceFields();
    onOpenChange(false);
    toast.success('Luogo aggiunto');
  };

  const handleSave = () => {
    if (!validateTimesOrToast()) return;
    commitPlaceFields();
    onOpenChange(false);
    toast.success('Modifiche salvate');
  };

  const handleBack = () => {
    // Indietro su pending: annulla e rimuovi il blocco bozza
    if (isAddMode) {
      onRemove(block.id);
    }
    onOpenChange(false);
  };

  const handleRemove = () => {
    onRemove(block.id);
    onOpenChange(false);
  };

  const searchFlight = async () => {
    setFlightLoading(true);
    try {
      const params = new URLSearchParams({
        destination: draft.destination,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });
      const originIata =
        (block.content.origin as string | undefined) ?? draft.organizerOrigin?.iata;
      if (originIata) params.set('origin', originIata);

      const response = await fetch(`/api/travel/estimate?${params}`);
      const data = await response.json();

      const quote = data.quote;
      const updates: Record<string, unknown> = {
        affiliateUrl: data.affiliateUrl ?? affiliateUrl,
      };

      if (response.ok && data.found && quote) {
        Object.assign(updates, {
          title: `Volo ${quote.origin} → ${quote.destination}`,
          price: quote.price,
          currency: quote.currency,
          airline: quote.airline,
          origin: quote.origin,
          destination: quote.destination,
        });
        patchContent(updates);
        toast.success(`Volo trovato: ${quote.price} ${quote.currency} ✈️`);
        return;
      }

      if (data.affiliateUrl) {
        patchContent(updates);
        toast.info(
          data.message ??
            'Nessun prezzo in cache — usa il link affiliate per tariffe aggiornate.',
          { duration: 5000 }
        );
        return;
      }

      toast.warning(data.message ?? 'Configura Travelpayouts per i voli', { duration: 8000 });
    } catch {
      toast.error('Errore ricerca volo');
    } finally {
      setFlightLoading(false);
    }
  };

  const submitAlternative = () => {
    if (!altLabel.trim()) return;
    const price = altPrice ? Number(altPrice) : null;

    onUpdate(block.id, (b) => ({
      ...b,
      alternatives: [
        ...b.alternatives,
        {
          id: createAlternativeId(),
          label: altLabel.trim(),
          price: Number.isFinite(price) ? price : null,
          currency: 'EUR',
        },
      ],
    }));
    setAltLabel('');
    setAltPrice('');
    setShowAltForm(false);
    toast.success('Alternativa aggiunta');
  };

  const inputClass =
    'composer-input h-11 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-accent/40';

  // ── UI luogo (attraction / activity / meal) ──────────────────────────────
  if (isPlaceBlock) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="composer-editor-dialog max-h-[min(92dvh,820px)] max-w-lg gap-0 overflow-y-auto overflow-x-visible rounded-3xl border-white/10 bg-slate-950/95 p-0 text-white backdrop-blur-xl">
          <div className={`h-2 bg-gradient-to-r ${meta.color.split(' ').slice(0, 2).join(' ')}`} />

          <div className="relative z-10 space-y-5 p-6 pb-8">
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-display text-xl flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
                  {meta.emoji}
                </span>
                <div>
                  <span className="block text-white">{dialogTitle}</span>
                  <span className="block text-xs font-normal text-white/40 mt-0.5">
                    {meta.label}
                    {typeof block.content.place === 'string' && block.content.place
                      ? ` · ${block.content.place}`
                      : ''}
                  </span>
                </div>
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isAddMode ? 'Aggiungi tappa al piano' : 'Modifica tappa del piano'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">Titolo</Label>
              <Input
                className={inputClass}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Nome del luogo"
              />
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Durata
              </p>
              <div className="flex flex-wrap gap-2">
                {DURATION_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleDurationChange(f.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      duration === f.id
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative z-30 grid max-w-md grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Orario inizio
                </span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="relative z-30 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  Orario fine
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="relative z-30 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15"
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">
                Prezzo stimato (opzionale)
              </Label>
              <Input
                className={inputClass}
                type="text"
                inputMode="decimal"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                placeholder="Es. 25"
              />
            </div>

            {block.type === 'activity' && (
              <div className="space-y-2">
                <Label className="text-white/50 text-xs uppercase tracking-wider">Note</Label>
                <Textarea
                  className={`${inputClass} min-h-[72px] resize-none`}
                  value={String(block.content.description ?? block.content.notes ?? '')}
                  onChange={(e) => patchContent({ description: e.target.value })}
                  rows={2}
                  placeholder="Dettagli opzionali…"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {isAddMode ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 rounded-full border border-white/15 text-white hover:bg-white/10"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Indietro
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-white"
                    onClick={handleAddConfirm}
                  >
                    Aggiungi
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 rounded-full bg-rose-600/80 hover:bg-rose-600"
                    onClick={handleRemove}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Rimuovi
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-white"
                    onClick={handleSave}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Salva
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── UI generica (volo, hotel, trasporto, note…) ──────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="composer-editor-dialog max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-white/10 bg-slate-950/95 backdrop-blur-xl text-white p-0 gap-0">
        <div className={`h-2 bg-gradient-to-r ${meta.color.split(' ').slice(0, 2).join(' ')}`} />

        <div className="p-6 space-y-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-xl flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
                {meta.emoji}
              </span>
              <div>
                <span className="block text-white">Modifica {meta.label}</span>
                <span className="block text-xs font-normal text-white/40 mt-0.5">{meta.hint}</span>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Modifica i dettagli del blocco {meta.label} nel piano di viaggio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-white/50 text-xs uppercase tracking-wider">Titolo</Label>
            <Input
              className={inputClass}
              value={String(block.content.title ?? '')}
              onChange={(e) => patchContent({ title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">Fascia oraria</Label>
              <select
                className={`${inputClass} w-full px-3`}
                value={String(block.content.timeSlot ?? 'flex')}
                onChange={(e) => patchContent({ timeSlot: e.target.value })}
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900">
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">Durata</Label>
              <select
                className={`${inputClass} w-full px-3`}
                value={String(block.content.duration ?? '')}
                onChange={(e) => patchContent({ duration: e.target.value })}
              >
                <option value="" className="bg-slate-900">
                  —
                </option>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {block.type === 'flight' && (
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full rounded-xl h-11 shadow-lg shadow-sky-500/10"
                onClick={() => void searchFlight()}
                disabled={flightLoading}
              >
                {flightLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Aggiorna da cache Travelpayouts
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Passeggeri</Label>
                  <Input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={9}
                    value={String(block.content.passengers ?? 1)}
                    onChange={(e) => patchContent({ passengers: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Classe</Label>
                  <select
                    className={`${inputClass} w-full px-3`}
                    value={String(block.content.travelClass ?? 'economy')}
                    onChange={(e) => patchContent({ travelClass: e.target.value })}
                  >
                    {TRAVEL_CLASSES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {!embedOnly && Boolean(affiliateUrl || block.content.affiliateUrl) && (
                <Button
                  asChild
                  variant="secondary"
                  className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white border-0"
                >
                  <a
                    href={affiliateUrl ?? String(block.content.affiliateUrl)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                  >
                    Apri ricerca voli affiliate
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          )}

          {block.type === 'hotel' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-white/50 text-xs uppercase tracking-wider">
                  Zona / quartiere
                </Label>
                <Input
                  className={inputClass}
                  value={String(block.content.area ?? '')}
                  onChange={(e) => patchContent({ area: e.target.value })}
                  placeholder="Es. Centro storico…"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Notti</Label>
                  <Input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={String(block.content.nights ?? 1)}
                    onChange={(e) => patchContent({ nights: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Ospiti</Label>
                  <Input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={String(block.content.guests ?? 2)}
                    onChange={(e) => patchContent({ guests: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Prezzo (€)</Label>
                  <Input
                    className={inputClass}
                    type="number"
                    value={block.content.price != null ? String(block.content.price) : ''}
                    onChange={(e) =>
                      patchContent({ price: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {block.type === 'transport' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {TRANSPORT_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => patchContent({ mode: m.id })}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      block.content.mode === m.id
                        ? 'border-accent/50 bg-accent/15 text-accent'
                        : 'border-white/10 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Da</Label>
                  <Input
                    className={inputClass}
                    value={String(block.content.from ?? '')}
                    onChange={(e) => patchContent({ from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">A</Label>
                  <Input
                    className={inputClass}
                    value={String(block.content.to ?? '')}
                    onChange={(e) => patchContent({ to: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {block.type === 'note' && (
            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">Nota</Label>
              <Textarea
                className={`${inputClass} min-h-[100px] resize-none`}
                value={String(block.content.body ?? '')}
                onChange={(e) => patchContent({ body: e.target.value })}
                rows={4}
              />
            </div>
          )}

          {(block.type === 'flight' || block.type === 'hotel') && (
            <div className="rounded-2xl border border-white/10 p-4 space-y-3 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <Label className="text-white/60 text-xs uppercase tracking-wider">
                  Alternative ({block.alternatives.length})
                </Label>
                {!showAltForm && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-accent hover:text-accent hover:bg-accent/10 rounded-lg"
                    onClick={() => setShowAltForm(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Aggiungi
                  </Button>
                )}
              </div>
              {showAltForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 pb-1"
                >
                  <Input
                    className={inputClass}
                    placeholder="Nome alternativa"
                    value={altLabel}
                    onChange={(e) => setAltLabel(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Input
                      className={`${inputClass} flex-1`}
                      type="number"
                      placeholder="Prezzo €"
                      value={altPrice}
                      onChange={(e) => setAltPrice(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-11 w-11 rounded-xl shrink-0"
                      onClick={submitAlternative}
                      disabled={!altLabel.trim()}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 rounded-xl shrink-0 text-white/40"
                      onClick={() => setShowAltForm(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
              {block.alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="flex items-center justify-between rounded-xl border border-white/8 px-3 py-2.5 text-sm"
                >
                  <span>{alt.label}</span>
                  <span className="text-accent font-semibold">
                    {alt.price != null ? `${alt.price}€` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-full bg-rose-600/80 hover:bg-rose-600"
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Rimuovi
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-white"
              onClick={() => onOpenChange(false)}
            >
              <Check className="mr-2 h-4 w-4" />
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
