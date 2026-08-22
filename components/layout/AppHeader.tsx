'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Navbar: solida di default; su /destinazioni trasparente sopra l’hero. */
export function AppHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onCatalog = pathname === '/destinazioni';
  const [overHero, setOverHero] = useState(onCatalog);

  useEffect(() => {
    if (!onCatalog) {
      setOverHero(false);
      return;
    }
    const update = () => setOverHero(window.scrollY < 480);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [onCatalog]);

  return (
    <header
      data-hero={overHero ? 'true' : undefined}
      className={cn(
        'group/nav fixed top-0 right-0 left-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
        overHero
          ? 'border-transparent bg-transparent text-white shadow-none'
          : 'border-b border-slate-200 bg-white text-slate-900 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.25)]'
      )}
    >
      {children}
    </header>
  );
}
