import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Badge tones aligned with mockup ds.css `.b-ok` / `.b-warn` / `.b-err` / `.b-info` / `.b-neu`. */
export type StatusBadgeTone = 'ok' | 'warn' | 'err' | 'info' | 'neu';

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  ok: 'bg-[color-mix(in_srgb,var(--color-success)_12%,white)] text-[var(--color-success)] border-[color-mix(in_srgb,var(--color-success)_35%,white)]',
  warn: 'bg-[color-mix(in_srgb,var(--color-warning)_12%,white)] text-[var(--color-warning)] border-[color-mix(in_srgb,var(--color-warning)_40%,white)]',
  err: 'bg-[color-mix(in_srgb,var(--color-error)_10%,white)] text-[var(--color-error)] border-[color-mix(in_srgb,var(--color-error)_35%,white)]',
  info: 'bg-[var(--color-tint)] text-[var(--color-primary)] border-[#D5D9F2]',
  neu: 'bg-[#F4F5F9] text-[var(--color-text-secondary)] border-[var(--color-border)]',
};

export function statusBadgeToneClass(tone: StatusBadgeTone): string {
  return TONE_CLASS[tone];
}

type StatusBadgeProps = {
  tone: StatusBadgeTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  'data-testid'?: string;
};

/** Unified status pill for hub / dashboard / leg rows (mockup StatusBadge). */
export function StatusBadge({
  tone,
  children,
  icon,
  className,
  'data-testid': testId = 'status-badge',
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[12px] font-bold leading-none',
        TONE_CLASS[tone],
        className
      )}
      data-testid={testId}
      data-tone={tone}
    >
      {icon ? <span className="inline-flex shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span> : null}
      {children}
    </span>
  );
}
