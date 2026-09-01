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
  { id: 'destinazioni', label: 'Esplora', Icon: Compass },
  { id: 'unisciti', label: 'Unisciti', Icon: Users },
];

export function HomePathSelector({ value }: { value: HomeEntryPath }) {
  return (
    <div
      className="flex w-full gap-1 rounded-full border border-slate-200/90 bg-white p-1 shadow-sm"
      role="navigation"
      aria-label="Esplora o Unisciti"
    >
      {PATHS.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <Link
            key={id}
            href={homeEntryPathToHref(id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:text-primary'
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

/** Frame condiviso Esplora / Unisciti: stesso toggle, stessi filtri, stesso content width. */
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
