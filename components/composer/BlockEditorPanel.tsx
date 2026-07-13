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
import { Loader2, Plus, RefreshCw, Trash2, ExternalLink, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { BLOCK_META, createAlternativeId, DURATION_OPTIONS } from '@/lib/composer/blocks';
import { hasTravelpayoutsEmbed } from '@/lib/travelpayouts/public-config';
import { PlaceSearchInput } from '@/components/composer/plan/PlaceSearchInput';
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
    if (!open) {
      setShowAltForm(false);
      setAltLabel('');
      setAltPrice('');
    }
  }, [open]);

  if (!block) return null;

  const meta = BLOCK_META[block.type];

  const patchContent = (patch: Record<string, unknown>) => {
    onUpdate(block.id, (b) => ({
      ...b,
      content: { ...b.content, ...patch },
    }));
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
        const setupHint = data.warnings?.[0] ?? data.setup?.hints?.find((h: string) =>
          h.includes('not subscribed') || h.includes('TRS') || h.includes('Project')
        );
        if (setupHint) {
          toast.warning(setupHint, { duration: 8000 });
        }
        toast.info(
          data.message ??
            'Nessun prezzo in cache — normale. Usa il link affiliate per tariffe aggiornate.',
          { duration: 5000 }
        );
        return;
      }

      const hint =
        data.warnings?.[0] ??
        data.setup?.hints?.[0] ??
        data.message ??
        'Configura marker + TRAVELPAYOUTS_TRS_ID e iscriviti ad Aviasales + Booking.com';
      toast.warning(hint, { duration: 8000 });
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
                <option value="" className="bg-slate-900">—</option>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d} className="bg-slate-900">{d}</option>
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
              {embedOnly && (
                <p className="text-xs text-white/45 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  Il widget affiliate non può passare il volo scelto all&apos;app — per tariffe live
                  cerca nel widget, poi aggiorna qui o usa &quot;Importa volo&quot; nella sidebar.
                </p>
              )}
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
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-2">
                  <Label className="text-white/50 text-xs uppercase tracking-wider">Compagnia</Label>
                  <Input
                    className={inputClass}
                    value={String(block.content.airline ?? '')}
                    onChange={(e) => patchContent({ airline: e.target.value })}
                  />
                </div>
              </div>
              {!embedOnly && Boolean(affiliateUrl || block.content.affiliateUrl) && (
                <Button asChild variant="secondary" className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white border-0">
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
                <Label className="text-white/50 text-xs uppercase tracking-wider">Zona / quartiere</Label>
                <Input
                  className={inputClass}
                  value={String(block.content.area ?? '')}
                  onChange={(e) => patchContent({ area: e.target.value })}
                  placeholder="Es. Centro storico, Seminyak..."
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
              {embedOnly ? (
                <p className="text-xs text-white/45 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  Cerca hotel nel widget voli (tab hotel) o inserisci i dettagli manualmente.
                </p>
              ) : Boolean(affiliateUrl || block.content.affiliateUrl) ? (
                <Button asChild variant="secondary" className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white border-0">
                  <a
                    href={affiliateUrl ?? String(block.content.affiliateUrl)}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                  >
                    Cerca hotel su Booking.com
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : null}
            </div>
          )}

          {block.type === 'attraction' && (
            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">Luogo</Label>
              <PlaceSearchInput
                className={`${inputClass} pl-10`}
                value={String(block.content.place ?? '')}
                onChange={(place, coords) =>
                  patchContent({
                    place,
                    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
                  })
                }
                placeholder="Cerca attrazione nel mondo..."
              />
            </div>
          )}

          {block.type === 'activity' && (
            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">Descrizione attività</Label>
              <Textarea
                className={`${inputClass} min-h-[88px] resize-none`}
                value={String(block.content.description ?? '')}
                onChange={(e) => patchContent({ description: e.target.value })}
                rows={3}
              />
            </div>
          )}

          {block.type === 'meal' && (
            <div className="space-y-2">
              <Label className="text-white/50 text-xs uppercase tracking-wider">Ristorante / zona</Label>
              <PlaceSearchInput
                className={`${inputClass} pl-10`}
                value={String(block.content.place ?? '')}
                onChange={(place, coords) =>
                  patchContent({
                    place,
                    ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
                  })
                }
                placeholder="Cerca ristorante o quartiere..."
              />
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
              <Label className="text-white/50 text-xs uppercase tracking-wider">Nota per la crew</Label>
              <Textarea
                className={`${inputClass} min-h-[100px] resize-none`}
                value={String(block.content.body ?? '')}
                onChange={(e) => patchContent({ body: e.target.value })}
                rows={4}
              />
            </div>
          )}

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
                  placeholder="Nome alternativa (es. Volo con scalo)"
                  value={altLabel}
                  onChange={(e) => setAltLabel(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Input
                    className={`${inputClass} flex-1`}
                    type="number"
                    placeholder="Prezzo € (opzionale)"
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
                    className="h-11 w-11 rounded-xl shrink-0 text-white/40 hover:text-white"
                    onClick={() => setShowAltForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {block.alternatives.length === 0 && !showAltForm ? (
              <p className="text-xs text-white/35 leading-relaxed">
                Confronta voli, hotel o attività diverse — scegli quella che preferisci.
              </p>
            ) : (
              <ul className="space-y-2">
                {block.alternatives.map((alt) => (
                  <li
                    key={alt.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-all ${
                      block.selectedAlternativeId === alt.id
                        ? 'border-accent/50 bg-accent/10 text-white'
                        : 'border-white/8 hover:bg-white/[0.04] text-white/80'
                    }`}
                    onClick={() =>
                      onUpdate(block.id, (b) => ({
                        ...b,
                        selectedAlternativeId: alt.id,
                      }))
                    }
                  >
                    <span className="truncate">{alt.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-accent">
                      {alt.price != null ? `${alt.price}€` : '—'}
                    </span>
                  </li>
                ))}
                {block.alternatives.length > 0 && (
                  <button
                    type="button"
                    className="w-full text-xs text-white/35 hover:text-white/60 py-1 transition-colors"
                    onClick={() =>
                      onUpdate(block.id, (b) => ({ ...b, selectedAlternativeId: null }))
                    }
                  >
                    Usa opzione principale
                  </button>
                )}
              </ul>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-full bg-rose-600/80 hover:bg-rose-600"
              onClick={() => {
                onRemove(block.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Rimuovi
            </Button>
            {!embedOnly &&
              typeof block.content.affiliateUrl === 'string' &&
              block.content.affiliateUrl && (
                <Button asChild size="sm" variant="outline" className="rounded-full border-white/15 text-white hover:bg-white/10">
                  <a
                    href={block.content.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Prenota
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}