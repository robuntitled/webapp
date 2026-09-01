import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LegalDocNav } from '@/components/legal/LegalDocNav';

export function LegalPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(15,118,110,0.07),transparent_55%),linear-gradient(to_bottom,#f8fafc,white_32%)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="nl-page flex h-[var(--nl-nav-height)] items-center justify-between gap-3">
          <Link
            href="/destinazioni"
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <BrandLogo size={28} />
          </Link>
          <LegalDocNav className="hidden sm:flex" />
          <Link
            href="/destinazioni"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden md:inline">Torna all&apos;app</span>
            <span className="md:hidden">Indietro</span>
          </Link>
        </div>
        <div className="nl-page pb-3 sm:hidden">
          <LegalDocNav className="w-full justify-center" />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
