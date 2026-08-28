'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Navbar integrata: trasparente sul body/hero, vetro leggero allo scroll. */
export function AppHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onHeroPage = pathname === '/destinazioni' || pathname.startsWith('/destinazioni');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [pathname]);

  const overHero = onHeroPage && !scrolled;

  return (
    <header
      data-hero={overHero ? 'true' : undefined}
      className={cn(
        'group/nav fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-300',
        scrolled
          ? 'border-b border-slate-200/45 bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/62'
          : 'border-b border-transparent bg-transparent',
        overHero ? 'text-white' : 'text-slate-800'
      )}
    >
      {children}
    </header>
  );
}
