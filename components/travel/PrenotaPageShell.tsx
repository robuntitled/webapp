import type { ReactNode } from 'react';
import { auth } from '@/auth';
import { PrenotaNavTabs } from '@/components/travel/PrenotaNavTabs';
import { PrenotaBookableBanner } from '@/components/travel/PrenotaBookableBanner';
import { ComplianceNotes } from '@/components/legal/ComplianceNotes';
import { fetchBookableTripsForUser } from '@/lib/data/bookable-trips';

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
  const session = await auth();
  const bookable = session?.user?.id ? await fetchBookableTripsForUser(session.user.id) : [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="relative overflow-hidden border-b border-border/70">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.55_0.1_200_/0.12),transparent_55%),radial-gradient(ellipse_at_top_right,oklch(0.68_0.16_45_/0.1),transparent_50%)]"
        />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-4 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Prenota
            </p>
            {badge ? (
              <span className="rounded-full border border-accent/40 bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {badge}
              </span>
            ) : null}
          </div>
          <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
          {simple ? null : <ComplianceNotes className="mt-3 max-w-2xl" />}
          {simple ? null : (
          <div className="mt-3">
            <PrenotaNavTabs />
          </div>
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-4xl px-4 py-4 sm:py-5">
        {simple ? null : <PrenotaBookableBanner trips={bookable} />}
        {children}
      </div>
    </div>
  );
}
