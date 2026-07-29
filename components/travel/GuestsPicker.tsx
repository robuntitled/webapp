'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type GuestsPickerProps = {
  adults: number;
  childrenCount: number;
  onAdultsChange: (n: number) => void;
  onChildrenChange: (n: number) => void;
  /** Età bambini (LiteAPI); se omesso non mostra selettori età */
  childAges?: number[];
  onChildAgesChange?: (ages: number[]) => void;
  maxAdults?: number;
  maxChildren?: number;
  className?: string;
  label?: string;
};

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuisci ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-primary/40 disabled:opacity-35"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Aumenta ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:border-primary/40 disabled:opacity-35"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function GuestsPicker({
  adults,
  childrenCount,
  onAdultsChange,
  onChildrenChange,
  childAges,
  onChildAgesChange,
  maxAdults = 9,
  maxChildren = 6,
  className,
  label = 'Ospiti',
}: GuestsPickerProps) {
  const [open, setOpen] = useState(false);
  const withAges = Boolean(onChildAgesChange);

  const summary = useMemo(() => {
    const parts = [
      `${adults} ${adults === 1 ? 'adulto' : 'adulti'}`,
      childrenCount > 0
        ? `${childrenCount} ${childrenCount === 1 ? 'bambino' : 'bambini'}`
        : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }, [adults, childrenCount]);

  const setChildren = (n: number) => {
    const next = Math.min(maxChildren, Math.max(0, n));
    onChildrenChange(next);
    if (onChildAgesChange) {
      const prev = childAges ?? [];
      if (next > prev.length) {
        onChildAgesChange([
          ...prev,
          ...Array.from({ length: next - prev.length }, () => 8),
        ]);
      } else if (next < prev.length) {
        onChildAgesChange(prev.slice(0, next));
      }
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-12 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left transition',
              'hover:border-slate-300 hover:bg-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary',
              open && 'border-primary bg-white ring-2 ring-primary/20'
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {summary}
              </span>
              <span className="block text-[11px] text-slate-500">
                {childrenCount > 0 ? 'Adulti e bambini' : 'Solo adulti'}
              </span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(100vw-2rem,300px)] rounded-2xl border-slate-200 p-3 shadow-2xl shadow-slate-900/15"
        >
          <Stepper
            label="Adulti"
            hint="18+ anni"
            value={adults}
            min={1}
            max={maxAdults}
            onChange={onAdultsChange}
          />
          <div className="border-t border-border/60" />
          <Stepper
            label="Bambini"
            hint="0–17 anni"
            value={childrenCount}
            min={0}
            max={maxChildren}
            onChange={setChildren}
          />
          {withAges && childrenCount > 0 ? (
            <div className="mt-1 space-y-2 border-t border-border/60 pt-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Età bambini
              </p>
              {(childAges ?? []).slice(0, childrenCount).map((age, i) => (
                <label
                  key={i}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">Bambino {i + 1}</span>
                  <select
                    value={age}
                    onChange={(e) => {
                      const next = [...(childAges ?? [])];
                      next[i] = Number(e.target.value);
                      onChildAgesChange?.(next);
                    }}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-medium"
                  >
                    {Array.from({ length: 18 }, (_, a) => a).map((a) => (
                      <option key={a} value={a}>
                        {a === 0 ? '< 1 anno' : `${a} anni`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
