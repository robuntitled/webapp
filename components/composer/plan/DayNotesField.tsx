'use client';

import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

type DayNotesFieldProps = {
  value: string;
  onChange: (notes: string) => void;
};

/**
 * Stato locale + debounce: evita di aggiornare il draft a ogni tasto
 * (che faceva ricalcolare i pin e "flashare" la mappa).
 */
export function DayNotesField({ value, onChange }: DayNotesFieldProps) {
  const [local, setLocal] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Traccia l'ultimo value "esterno" per non sovrascrivere mentre digiti
  const lastCommitted = useRef(value);

  useEffect(() => {
    // Sync solo se il parent ha un valore diverso (cambio giorno / reset)
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setLocal(value);
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

  return (
    <div className="space-y-1.5">
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Note del giorno
      </p>
      <Textarea
        className="min-h-[72px] resize-none rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400"
        placeholder="Promemoria, idee, link utili per questa giornata…"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== lastCommitted.current) {
            lastCommitted.current = local;
            onChange(local);
          }
        }}
      />
    </div>
  );
}
