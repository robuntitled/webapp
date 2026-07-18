'use client';

import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';

type DayNotesFieldProps = {
  value: string;
  onChange: (notes: string) => void;
};

/**
 * Note del giorno a comparsa (icona) per UI più pulita.
 * Stato locale + debounce per non thrashare il draft.
 */
export function DayNotesField({ value, onChange }: DayNotesFieldProps) {
  const [open, setOpen] = useState(Boolean(value?.trim()));
  const [local, setLocal] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setLocal(value);
      if (value?.trim()) setOpen(true);
    }
  }, [value]);

  useEffect(() => {
    if (local === lastCommitted.current) return;
    const t = window.setTimeout(() => {
      lastCommitted.current = local;
      onChangeRef.current(local);
    }, 450);
    return () => window.clearTimeout(t);
  }, [local]);

  const hasNotes = Boolean(local.trim());

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          open || hasNotes
            ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
            : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
        }`}
        aria-expanded={open}
        title="Note del giorno"
      >
        <StickyNote className="h-3.5 w-3.5" />
        Note
        {hasNotes && !open && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        )}
      </button>

      {open && (
        <div className="space-y-1.5">
          <Textarea
            className="min-h-[72px] resize-none rounded-xl border-white/15 bg-white/5 text-sm text-white placeholder:text-white/35 focus-visible:ring-amber-400/30"
            placeholder="Promemoria, idee, link utili per questa giornata…"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => {
              if (local !== lastCommitted.current) {
                lastCommitted.current = local;
                onChange(local);
              }
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}