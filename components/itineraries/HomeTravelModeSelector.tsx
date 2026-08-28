'use client';

import { Globe, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomeTravelMode } from '@/lib/itineraries/home-travel-mode';

const MODES: {
  id: HomeTravelMode;
  label: string;
  Icon: typeof User;
}[] = [
  { id: 'solo', label: 'Solo', Icon: User },
  { id: 'friends', label: 'Con amici', Icon: Users },
  { id: 'group', label: 'Gruppo aperto', Icon: Globe },
];

export function HomeTravelModeSelector({
  value,
  onChange,
}: {
  value: HomeTravelMode;
  onChange: (mode: HomeTravelMode) => void;
}) {
  return (
    <div
      className="inline-flex w-full max-w-2xl flex-wrap justify-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:flex-nowrap"
      role="tablist"
      aria-label="Modalità di viaggio"
    >
      {MODES.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-700 hover:text-primary'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
