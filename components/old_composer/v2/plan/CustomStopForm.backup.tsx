'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlaceSearchInput } from '@/components/composer/plan/PlaceSearchInput';
import type { ComposerBlockType } from '@/types/composer';
import { MapPin, Plus, X } from 'lucide-react';

export type CustomStopPayload = {
  type: 'attraction' | 'activity';
  title: string;
  time?: string;
  note?: string;
  place?: string;
  lat?: number;
  lng?: number;
};

type CustomStopFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CustomStopPayload) => void;
  defaultType?: 'attraction' | 'activity';
};

export function CustomStopForm({
  open,
  onOpenChange,
  onSubmit,
  defaultType = 'attraction',
}: CustomStopFormProps) {
  const [type, setType] = useState<'attraction' | 'activity'>(defaultType);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [place, setPlace] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const reset = () => {
    setTitle('');
    setTime('');
    setNote('');
    setPlace('');
    setCoords(null);
    setType(defaultType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onSubmit({
      type,
      title: trimmed,
      time: time.trim() || undefined,
      note: note.trim() || undefined,
      place: place.trim() || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.form
          key="custom-stop-form"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onSubmit={handleSubmit}
          className="composer-custom-stop overflow-hidden"
        >
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white/80">Tappa personalizzata</p>
              <button
                type="button"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                className="composer-icon-btn"
                aria-label="Chiudi form"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex gap-2">
              {(
                [
                  { id: 'attraction' as const, label: 'Attrazione' },
                  { id: 'activity' as const, label: 'Attività' },
                ] satisfies { id: ComposerBlockType; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`composer-chip flex-1 text-center ${
                    type === opt.id ? 'composer-chip-active' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stop-name" className="text-[11px] text-white/45">
                Nome
              </Label>
              <Input
                id="stop-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Colosseo, Tour in barca…"
                className="h-9 rounded-xl bg-white/[0.04] border-white/10 text-sm"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stop-time" className="text-[11px] text-white/45">
                Orario
              </Label>
              <Input
                id="stop-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 rounded-xl bg-white/[0.04] border-white/10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/45 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Indirizzo / luogo
              </Label>
              <PlaceSearchInput
                value={place}
                onChange={(label, c) => {
                  setPlace(label);
                  setCoords(c ?? null);
                }}
                placeholder="Cerca o lascia vuoto"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stop-note" className="text-[11px] text-white/45">
                Nota
              </Label>
              <Textarea
                id="stop-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Promemoria opzionale…"
                rows={2}
                className="rounded-xl bg-white/[0.04] border-white/10 text-sm resize-none"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              className="w-full rounded-xl h-9 font-semibold"
              disabled={!title.trim()}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Aggiungi al giorno
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
