'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ClockCity = {
  id: string;
  label: string;
  timeZone: string;
};

const PRESETS: ClockCity[] = [
  { id: 'rome', label: 'Roma', timeZone: 'Europe/Rome' },
  { id: 'london', label: 'Londra', timeZone: 'Europe/London' },
  { id: 'nyc', label: 'New York', timeZone: 'America/New_York' },
  { id: 'tokyo', label: 'Tokyo', timeZone: 'Asia/Tokyo' },
  { id: 'bangkok', label: 'Bangkok', timeZone: 'Asia/Bangkok' },
  { id: 'dubai', label: 'Dubai', timeZone: 'Asia/Dubai' },
];

const STORAGE_KEY = 'bradigo.worldClocks.v1';

function loadClocks(): ClockCity[] {
  if (typeof window === 'undefined') return [PRESETS[0]];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [PRESETS[0]];
    const parsed = JSON.parse(raw) as ClockCity[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [PRESETS[0]];
    return parsed;
  } catch {
    return [PRESETS[0]];
  }
}

function formatTime(timeZone: string, now: Date) {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(now);
}

export function WorldClocksWidget({ className }: { className?: string }) {
  const [clocks, setClocks] = useState<ClockCity[]>([PRESETS[0]]);
  const [now, setNow] = useState(() => new Date());
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setClocks(loadClocks());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clocks));
    } catch {
      /* ignore quota */
    }
  }, [clocks]);

  const available = useMemo(
    () => PRESETS.filter((p) => !clocks.some((c) => c.timeZone === p.timeZone)),
    [clocks]
  );

  return (
    <aside
      className={cn(
        'ws-widget w-full max-w-[16rem] shrink-0 rounded-2xl p-3',
        className
      )}
      aria-label="Orologi locali"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Ora locale
      </p>
      <ul className="space-y-1.5">
        {clocks.map((city) => (
          <li key={city.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-600">{city.label}</span>
            <span className="flex items-center gap-1 font-semibold tabular-nums text-slate-900">
              {formatTime(city.timeZone, now)}
              {clocks.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Rimuovi ${city.label}`}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                  onClick={() => setClocks((list) => list.filter((c) => c.id !== city.id))}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {adding && available.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {available.map((city) => (
            <button
              key={city.id}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-primary/40 hover:text-primary"
              onClick={() => {
                setClocks((list) => [...list, city]);
                setAdding(false);
              }}
            >
              {city.label}
            </button>
          ))}
        </div>
      ) : null}
      {available.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 px-1.5 text-xs text-slate-500"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-3 w-3" />
          Aggiungi città
        </Button>
      ) : null}
    </aside>
  );
}
