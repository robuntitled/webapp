import type { ReactNode } from 'react';
import { PrenotaNavTabs } from '@/components/travel/PrenotaNavTabs';
import { ComplianceNotes } from '@/components/legal/ComplianceNotes';

export async function PrenotaPageShell({
  title,
  subtitle,
  children,
  badge,
  simple = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Es. stato feature (hotel/attrazioni) */
  badge?: string;
  simple?: boolean;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-page,#F6F7FB)]">
      <div className="relative overflow-hidden border-b border-border/70 bg-white">
        <div className="relative nl-page w-full py-4 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Prenota
            </p>
            {/* Badge «PRENOTABILE» rimosso (Brand P0-2 / P1-18): contrasto e ridondanza */}
            {badge && badge.toLowerCase() !== 'prenotabile' ? (
              <span className="rounded-full border border-[var(--ok-bd,#BBE5C8)] bg-[var(--ok-bg,#ECFDF3)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-success)]">
                {badge}
              </span>
            ) : null}
          </div>
          <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
          {simple ? null : (
            <ComplianceNotes className="mt-3 max-w-2xl" maxItems={1} />
          )}
          {simple ? null : (
            <div className="mt-3">
              <PrenotaNavTabs />
            </div>
          )}
        </div>
      </div>
      <div className="nl-page w-full py-4 sm:py-5">{children}</div>
    </div>
  );
}
