'use client';

import { Textarea } from '@/components/ui/textarea';

type DayNotesFieldProps = {
  value: string;
  onChange: (notes: string) => void;
};

export function DayNotesField({ value, onChange }: DayNotesFieldProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 px-0.5">
        Note del giorno
      </p>
      <Textarea
        className="min-h-[72px] rounded-xl bg-white/[0.03] border-white/10 text-white text-sm placeholder:text-white/25 resize-none"
        placeholder="Promemoria, idee, link utili per questa giornata…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}