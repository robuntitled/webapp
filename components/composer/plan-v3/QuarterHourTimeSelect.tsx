'use client';

import { useMemo } from 'react';

/** Orari 12h a scatti di 15 minuti (12:00 … 11:45) + AM/PM. */
const CLOCK_12H: string[] = (() => {
  const out: string[] = [];
  // 12, 1, 2, ... 11
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  for (const h of hours) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${h}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

export function snapToQuarterHour(time: string): string {
  const t = time.trim();
  if (!t) return '';
  const [hs, ms] = t.split(':');
  const h = parseInt(hs ?? '', 10);
  const m = parseInt(ms ?? '', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m;
  const snapped = Math.round(total / 15) * 15;
  const nh = Math.floor((snapped % (24 * 60)) / 60);
  const nm = snapped % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function to12h(time24: string): { clock: string; period: 'AM' | 'PM' } {
  const snapped = snapToQuarterHour(time24);
  if (!snapped) return { clock: '12:00', period: 'AM' };
  const [hs, ms] = snapped.split(':');
  let h = parseInt(hs!, 10);
  const m = parseInt(ms!, 10);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return { clock: `${h}:${String(m).padStart(2, '0')}`, period };
}

function to24h(clock: string, period: 'AM' | 'PM'): string {
  const [hs, ms] = clock.split(':');
  let h = parseInt(hs ?? '12', 10);
  const m = parseInt(ms ?? '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type QuarterHourTimeSelectProps = {
  /** Valore interno sempre 24h HH:mm */
  value: string;
  onChange: (value24h: string) => void;
  className?: string;
  id?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

const selectClass =
  'relative z-30 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-2 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15';

/**
 * Due tendine: ora (ogni 15 min in formato 12h) + AM/PM.
 * Emette sempre HH:mm 24h.
 */
export function QuarterHourTimeSelect({
  value,
  onChange,
  className = '',
  id,
  allowEmpty = true,
  emptyLabel = '—',
}: QuarterHourTimeSelectProps) {
  const { clock, period } = useMemo(() => {
    if (!value.trim()) return { clock: '', period: 'AM' as const };
    return to12h(value);
  }, [value]);

  const wrap = className || 'relative z-30 grid grid-cols-[1fr_4.5rem] gap-1.5';

  return (
    <div className={wrap}>
      <select
        id={id}
        value={clock}
        onChange={(e) => {
          const c = e.target.value;
          if (!c) {
            onChange('');
            return;
          }
          onChange(to24h(c, period || 'AM'));
        }}
        className={selectClass}
      >
        {allowEmpty && (
          <option value="" className="bg-slate-900 text-white">
            {emptyLabel}
          </option>
        )}
        {CLOCK_12H.map((t) => (
          <option key={t} value={t} className="bg-slate-900 text-white">
            {t}
          </option>
        ))}
      </select>
      <select
        value={value.trim() ? period : ''}
        onChange={(e) => {
          const p = e.target.value as 'AM' | 'PM' | '';
          if (!p || !clock) {
            if (!clock) onChange('');
            return;
          }
          onChange(to24h(clock, p));
        }}
        className={selectClass}
        disabled={!clock && allowEmpty}
      >
        {allowEmpty && !clock && (
          <option value="" className="bg-slate-900 text-white">
            —
          </option>
        )}
        <option value="AM" className="bg-slate-900 text-white">
          AM
        </option>
        <option value="PM" className="bg-slate-900 text-white">
          PM
        </option>
      </select>
    </div>
  );
}
