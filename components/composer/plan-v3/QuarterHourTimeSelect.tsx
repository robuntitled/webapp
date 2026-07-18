'use client';

/** Orari a scatti di 15 minuti (00:00 … 23:45). */
export const QUARTER_HOUR_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

/** Arrotonda HH:mm al quarto d’ora più vicino (per valori legacy). */
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

type QuarterHourTimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  /** Mostra opzione vuota “—” */
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function QuarterHourTimeSelect({
  value,
  onChange,
  className = '',
  id,
  allowEmpty = true,
  emptyLabel = '—',
}: QuarterHourTimeSelectProps) {
  const normalized = value ? snapToQuarterHour(value) : '';
  const options = QUARTER_HOUR_OPTIONS;
  // Se valore non in lista (raro), lo aggiunge per non perdere il dato
  const hasValue = normalized && options.includes(normalized);
  const list =
    normalized && !hasValue ? [normalized, ...options] : options;

  return (
    <select
      id={id}
      value={normalized}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        'relative z-30 h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/15'
      }
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
