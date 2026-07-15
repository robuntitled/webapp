'use client';

import { Textarea } from '@/components/ui/textarea';

type DayNotesFieldProps = {
  value: string;
  onChange: (notes: string) => void;
};

export function DayNotesField({ value, onChange }: DayNotesFieldProps) {
  return (
    <div className="space-y-1.5">
      <p className="px-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Note del giorno
      </p>
      <Textarea
        className="min-h-[72px] resize-none rounded-xl border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400"
        placeholder="Promemoria, idee, link utili per questa giornata…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
