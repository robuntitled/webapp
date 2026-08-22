'use client';

import { cn } from '@/lib/utils';

export function AppHeader({ children }: { children: React.ReactNode }) {
  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-50 border-b-2 border-accent',
        'bg-[#0F766E] text-white shadow-[0_8px_24px_-12px_rgba(15,118,110,0.55)]'
      )}
    >
      {children}
    </header>
  );
}
