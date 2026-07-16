'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TravelpayoutsEmbedWidget } from '@/components/travel/TravelpayoutsEmbedWidget';
import { primaryOriginIata } from '@/lib/composer/origins';
import { buildFlightSearchEmbedUrl } from '@/lib/travelpayouts/embed-config';
import type { ComposerBlockType, ComposerDraft } from '@/types/composer';
import { Bus, Hotel, X } from 'lucide-react';

export type TravelBlockPayload = {
  type: ComposerBlockType;
  title: string;
  place?: string;
  pickupAddress?: string;
};

type AddTravelBlockModalProps = {
  open: boolean;
  mode: 'transport' | 'hotel';
  onOpenChange: (open: boolean) => void;
  draft: ComposerDraft;
  onConfirm: (payload: TravelBlockPayload) => void;
};

export function AddTravelBlockModal({
  open,
  mode,
  onOpenChange,
  draft,
  onConfirm,
}: AddTravelBlockModalProps) {
  const [pickup, setPickup] = useState('');
  const [label, setLabel] = useState('');

  const originIata = primaryOriginIata(draft);
  const destLabel = draft.destinationMeta?.label ?? draft.destination;

  const embedUrl = useMemo(() => {
    return buildFlightSearchEmbedUrl({
      destination: draft.destination,
      destinationMeta: draft.destinationMeta,
      startDate: draft.startDate,
      endDate: draft.endDate,
      originIata,
    });
  }, [draft, originIata]);

  const handleConfirm = () => {
    onConfirm({
      type: mode === 'hotel' ? 'hotel' : 'transport',
      title:
        label.trim() ||
        (mode === 'hotel' ? `Hotel — ${destLabel}` : `Trasporto — ${destLabel}`),
      place: destLabel,
      pickupAddress: pickup.trim() || undefined,
    });
    setPickup('');
    setLabel('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="composer-v3-modal flex max-h-[92dvh] w-[min(96vw,720px)] flex-col gap-0 overflow-hidden rounded-3xl border-white/10 bg-[#0b1120] p-0"
      >
        <DialogHeader className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {mode === 'hotel' ? (
                <Hotel className="h-5 w-5 text-violet-400" />
              ) : (
                <Bus className="h-5 w-5 text-sky-400" />
              )}
              <div>
                <DialogTitle className="font-display text-lg text-white">
                  {mode === 'hotel' ? 'Aggiungi hotel' : 'Aggiungi trasporto'}
                </DialogTitle>
                <DialogDescription className="text-sm text-white/50">
                  Prenota via Travelpayouts e salva nel piano.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/40 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">Titolo nel piano</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={mode === 'hotel' ? 'Es. Hotel centro città' : 'Es. Volo andata'}
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">
              {mode === 'hotel' ? 'Indirizzo / zona hotel' : 'Punto di ritiro / partenza'}
            </label>
            <Input
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder={
                mode === 'hotel'
                  ? 'Es. Via Roma 12 o quartiere'
                  : 'Es. Aeroporto Fiumicino T3'
              }
              className="h-11 rounded-xl border-white/10 bg-white/5 text-white"
            />
          </div>

          {embedUrl ? (
            <div className="composer-tpwl-shell rounded-2xl overflow-hidden">
              <TravelpayoutsEmbedWidget
                key={`${mode}-${draft.startDate}-${pickup}`}
                embedUrl={embedUrl}
                minHeight={mode === 'hotel' ? 200 : 160}
              />
            </div>
          ) : (
            <p className="text-sm text-white/45 rounded-xl border border-white/10 p-4">
              Widget Travelpayouts non configurato — compila i campi e salva comunque nel piano.
            </p>
          )}
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <Button type="button" className="w-full rounded-full" onClick={handleConfirm}>
            Salva nel piano
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}