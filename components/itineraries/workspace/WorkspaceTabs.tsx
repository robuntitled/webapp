'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceTab } from '@/lib/itineraries/workspace-tab';

export type WorkspaceTabItem = {
  id: WorkspaceTab;
  label: string;
  status: 'done' | 'pending' | 'count' | null;
  count?: number;
};

export function WorkspaceTabs({
  items,
  value,
  onChange,
  className,
}: {
  items: WorkspaceTabItem[];
  value: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-0.5 overflow-x-auto rounded-2xl border border-slate-200/90 bg-slate-50/90 p-1 shadow-sm backdrop-blur-sm',
        className
      )}
      role="tablist"
      aria-label="Configurazione viaggio"
    >
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              selected
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {item.label}
            {item.status === 'done' ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-3 w-3" aria-label="completato" />
              </span>
            ) : item.status === 'count' && item.count != null && item.count > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                {item.count}
              </span>
            ) : item.status === 'pending' && !selected ? (
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-400"
                aria-label="da completare"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
