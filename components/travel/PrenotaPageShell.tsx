import type { ReactNode } from 'react';
import { PrenotaNavTabs } from '@/components/travel/PrenotaNavTabs';

export function PrenotaPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Prenota
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        <PrenotaNavTabs />
      </div>
      {children}
    </div>
  );
}
