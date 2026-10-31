'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Compass, Users } from 'lucide-react';
import { ContinentFilterRow } from '@/components/itineraries/CatalogFiltersBar';
import { cn } from '@/lib/utils';
import type { HomeEntryPath } from '@/lib/itineraries/home-travel-mode';
import { homeEntryPathToHref } from '@/lib/itineraries/home-travel-mode';

const PATHS: {
  id: HomeEntryPath;
  label: string;
  Icon: typeof Compass;
}[] = [
  { id: 'organizza', label: 'Organizza', Icon: Compass },
  { id: 'gruppi', label: 'Gruppi', Icon: Users },
];

function normalizePath(value: HomeEntryPath): 'organizza' | 'gruppi' {
  if (value === 'unisciti' || value === 'gruppi') return 'gruppi';
  return 'organizza';
}

export function HomePathSelector({ value }: { value: HomeEntryPath }) {
  const current = normalizePath(value);
  return (
    <div
      className="flex w-full gap-1 rounded-full border border-[var(--color-border)] bg-white p-1 shadow-sm"
      role="navigation"
      aria-label="Organizza o Gruppi"
    >
      {PATHS.map(({ id, label, Icon }) => {
        const active = current === id;
        return (
          <Link
            key={id}
            href={homeEntryPathToHref(id)}
            prefetch={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase transition focus-visible:outline-none focus-visible:ring-2',
              active && id === 'gruppi'
                ? 'bg-primary text-white shadow-sm focus-visible:ring-primary/40'
                : active
                  ? 'bg-accent text-white shadow-sm focus-visible:ring-accent/40'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-brand)]'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

/** Frame condiviso Organizza / Gruppi. */
export function CatalogBrowseChrome({
  path,
  continent,
  onContinentChange,
  children,
  compact = false,
}: {
  path: HomeEntryPath;
  continent: string;
  onContinentChange: (continent: string) => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'nl-page relative z-10 min-h-0 w-full',
        compact ? 'pt-8 pb-12' : 'pt-11 pb-14'
      )}
    >
      <div className={cn('flex w-full justify-center', compact ? 'mb-4' : 'mb-5')}>
        <div className={cn('flex w-full max-w-xl flex-col', compact ? 'gap-3' : 'gap-4')}>
          <HomePathSelector value={path} />
          <ContinentFilterRow value={continent} onChange={onContinentChange} />
        </div>
      </div>
      <div className={compact ? 'space-y-6' : 'space-y-8'}>{children}</div>
    </div>
  );
}
