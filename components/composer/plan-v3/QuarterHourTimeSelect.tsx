'use client';

/** Orari 24h a scatti di 30 minuti (00:00 … 23:30). */
export const HALF_HOUR_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

/** Arrotonda HH:mm alla mezz’ora più vicina. */
export function snapToHalfHour(time: string): string {
  const t = time.trim();
  if (!t) return '';
  const [hs, ms] = t.split(':');
  const h = parseInt(hs ?? '', 10);
  const m = parseInt(ms ?? '', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m;
  const snapped = Math.round(total / 30) * 30;
  const nh = Math.floor((snapped % (24 * 60)) / 60);
  const nm = snapped % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// retrocompat
export const snapToQuarterHour = snapToHalfHour;

type QuarterHourTimeSelectProps = {
  /** Valore interno HH:mm 24h */
  value: string;
  onChange: (value24h: string) => void;
  className?: string;
  id?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

const selectClass =
  'relative z-30 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15';

/**
 * Tendina orari 00:00–23:30 a passi di 30 minuti (formato 24h, senza AM/PM).
 */
export function QuarterHourTimeSelect({
  value,
  onChange,
  className = '',
  id,
  allowEmpty = true,
  emptyLabel = '—',
}: QuarterHourTimeSelectProps) {
  const normalized = value ? snapToHalfHour(value) : '';
  const options = HALF_HOUR_OPTIONS;
  const hasValue = normalized && options.includes(normalized);
  const list = normalized && !hasValue ? [normalized, ...options] : options;

  return (
    <select
      id={id}
      value={normalized}
      onChange={(e) => onChange(e.target.value)}
      className={className || selectClass}
    >
      {allowEmpty && (
        <option value="" className="bg-slate-900 text-white">
          {emptyLabel}
        </option>
      )}
      {list.map((t) => (
        <option key={t} value={t} className="bg-slate-900 text-white">
          {t}
        </option>
      ))}
    </select>
  );
}
