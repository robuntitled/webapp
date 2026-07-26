import type { ReactNode } from 'react';
import { PrenotaNavTabs } from '@/components/travel/PrenotaNavTabs';

export function PrenotaPageShell({
  title,
  subtitle,
  children,
  badge,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Es. stato feature (hotel/attrazioni) */
  badge?: string;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="relative overflow-hidden border-b border-border/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.55_0.1_200_/0.12),transparent_55%),radial-gradient(ellipse_at_top_right,oklch(0.68_0.16_45_/0.1),transparent_50%)]"
        />
        <div className="container relative mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Prenota
            </p>
            {badge ? (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground/90">
                {badge}
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-4">
            <PrenotaNavTabs />
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</div>
    </div>
  );
}
