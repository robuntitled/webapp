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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0770e3]">
            Prenota
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{subtitle}</p>
          <div className="mt-4">
            <PrenotaNavTabs />
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</div>
    </div>
  );
}
