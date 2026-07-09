'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { BLOCK_META, createAlternativeId } from '@/lib/composer/blocks';
import type { ComposerBlock, ComposerDraft } from '@/types/composer';

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
      const response = await fetch(`/api/travel/estimate?${params}`);
      const data = await response.json();

      if (!response.ok || !data.found) {
        toast.message(data.message ?? 'Nessun volo in cache — aggiungi un\'alternativa manuale');
        return;
      }

      const quote = data.quote;
      patchContent({
        title: `Volo ${quote.origin} → ${quote.destination}`,
        price: quote.price,
        currency: quote.currency,
        airline: quote.airline,
        origin: quote.origin,
        destination: quote.destination,
      });
      toast.success(`Volo trovato: ${quote.price} ${quote.currency} ✈️`);
    } catch {
      toast.error('Errore ricerca volo');
    } finally {
      setFlightLoading(false);
    }
  };

  const addAlternative = () => {
    const label = prompt('Nome alternativa (es. Volo con scalo, Hotel zona centro)');
    if (!label?.trim()) return;
    const priceStr = prompt('Prezzo indicativo (€, opzionale)');
    const price = priceStr ? Number(priceStr) : null;

    onUpdate(block.id, (b) => ({
      ...b,
      alternatives: [
        ...b.alternatives,
        {
          id: createAlternativeId(),
          label: label.trim(),
          price: Number.isFinite(price) ? price : null,
          currency: 'EUR',
        },
      ],
    }));
    toast.success('Alternativa aggiunta');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <span>{meta.emoji}</span>
            Modifica {meta.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Titolo</Label>
            <Input
              value={String(block.content.title ?? '')}
              onChange={(e) => patchContent({ title: e.target.value })}
            />
          </div>

          {block.type === 'flight' && (
            <>
              <Button
                type="button"
                className="w-full"
                onClick={() => void searchFlight()}
                disabled={flightLoading}
              >
                {flightLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Cerca volo (cache Travelpayouts)
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Prezzo (€)</Label>
                  <Input
                    type="number"
                    value={block.content.price != null ? String(block.content.price) : ''}
                    onChange={(e) =>
                      patchContent({ price: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compagnia</Label>
                  <Input
                    value={String(block.content.airline ?? '')}
                    onChange={(e) => patchContent({ airline: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {block.type === 'hotel' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Zona / quartiere</Label>
                <Input
                  value={String(block.content.area ?? '')}
                  onChange={(e) => patchContent({ area: e.target.value })}
                  placeholder="Es. Centro storico, Seminyak..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Notti</Label>
                  <Input
                    type="number"
                    min={1}
                    value={String(block.content.nights ?? 1)}
                    onChange={(e) => patchContent({ nights: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prezzo totale (€)</Label>
                  <Input
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

          {(block.type === 'attraction' || block.type === 'activity') && (
            <div className="space-y-2">
              <Label>Luogo / descrizione</Label>
              <Textarea
                value={String(block.content.place ?? block.content.description ?? '')}
                onChange={(e) =>
                  patchContent(
                    block.type === 'attraction'
                      ? { place: e.target.value }
                      : { description: e.target.value }
                  )
                }
                rows={3}
              />
            </div>
          )}

          {block.type === 'meal' && (
            <div className="space-y-2">
              <Label>Dove mangiare</Label>
              <Input
                value={String(block.content.place ?? '')}
                onChange={(e) => patchContent({ place: e.target.value })}
              />
            </div>
          )}

          {block.type === 'note' && (
            <div className="space-y-2">
              <Label>Nota per la crew</Label>
              <Textarea
                value={String(block.content.body ?? '')}
                onChange={(e) => patchContent({ body: e.target.value })}
                rows={4}
              />
            </div>
          )}

          <div className="rounded-xl border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Alternative ({block.alternatives.length})</Label>
              <Button type="button" size="sm" variant="outline" onClick={addAlternative}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Aggiungi
              </Button>
            </div>
            {block.alternatives.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Confronta voli, hotel o attività diverse — scegli quella che preferisci.
              </p>
            ) : (
              <ul className="space-y-2">
                {block.alternatives.map((alt) => (
                  <li
                    key={alt.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                      block.selectedAlternativeId === alt.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() =>
                      onUpdate(block.id, (b) => ({
                        ...b,
                        selectedAlternativeId: alt.id,
                      }))
                    }
                  >
                    <span className="truncate">{alt.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {alt.price != null ? `${alt.price}€` : '—'}
                    </span>
                  </li>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() =>
                    onUpdate(block.id, (b) => ({ ...b, selectedAlternativeId: null }))
                  }
                >
                  Usa opzione principale
                </Button>
              </ul>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-full"
              onClick={() => {
                onRemove(block.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Rimuovi blocco
            </Button>
            {typeof block.content.affiliateUrl === 'string' && block.content.affiliateUrl && (
              <Button asChild size="sm" variant="outline" className="rounded-full">
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