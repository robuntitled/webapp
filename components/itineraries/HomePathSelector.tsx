'use client';

import Link from 'next/link';
import { Compass, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomeEntryPath } from '@/lib/itineraries/home-travel-mode';
import { homeEntryPathToHref } from '@/lib/itineraries/home-travel-mode';

const PATHS: {
  id: HomeEntryPath;
  label: string;
  Icon: typeof Compass;
}[] = [
  { id: 'destinazioni', label: 'Destinazioni', Icon: Compass },
  { id: 'unisciti', label: 'Unisciti', Icon: Users },
];

export function HomePathSelector({ value }: { value: HomeEntryPath }) {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-3">
      <p className="text-sm font-medium tracking-wide text-slate-500">Cosa vuoi fare?</p>
      <div
        className="inline-flex w-full max-w-xl gap-1 rounded-full border border-slate-200/90 bg-white/90 p-1 shadow-sm backdrop-blur-md"
        role="tablist"
        aria-label="Percorso di ingresso"
      >
        {PATHS.map(({ id, label, Icon }) => {
          const active = value === id;
          return (
            <Link
              key={id}
              href={homeEntryPathToHref(id)}
              role="tab"
              aria-selected={active}
              className={cn(
                'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-700 hover:text-primary'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
