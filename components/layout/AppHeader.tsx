'use client';

import { usePathname } from 'next/navigation';
import { isComposerPath } from '@/lib/ui/app-chrome';
import { cn } from '@/lib/utils';

export function AppHeader({ children }: { children: React.ReactNode }) {
  const dark = isComposerPath(usePathname());
  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 z-50 border-b border-border bg-background',
        dark && 'dark border-[#2a3344] bg-[#0b1220]'
      )}
    >
      {children}
    </header>
  );
}
