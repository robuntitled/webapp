import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

export function LegalPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full min-w-0 shrink-0 bg-[#f6f8fa]">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,rgba(15,118,110,0.09),transparent_65%)]"
        aria-hidden
      />
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="nl-page flex h-[var(--nl-nav-height)] items-center justify-between gap-4">
          <Link
            href="/destinazioni"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <BrandLogo size={28} />
          </Link>
          <Link
            href="/destinazioni"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-primary/25 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Torna all&apos;app</span>
            <span className="sm:hidden">Indietro</span>
          </Link>
        </div>
      </header>
      <main className="relative w-full min-w-0">{children}</main>
    </div>
  );
}
