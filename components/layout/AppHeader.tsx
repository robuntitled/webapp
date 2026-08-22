'use client';

import { cn } from '@/lib/utils';

/** Navbar chiara stile broker (Skyscanner / WeRoad). */
export function AppHeader({ children }: { children: React.ReactNode }) {
  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-50 border-b border-slate-200',
        'bg-white text-slate-900 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.25)]'
      )}
    >
      {children}
    </header>
  );
}
