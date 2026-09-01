'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { isHeroCatalogPath } from '@/lib/ui/app-chrome';

function heroProgress(): number {
  const hero = document.querySelector<HTMLElement>('[data-nl-hero]');
  if (!hero) return 1;
  const height = Math.max(hero.offsetHeight, 1);
  const top = hero.getBoundingClientRect().top;
  return Math.min(1, Math.max(0, -top / height));
}

/** Una sola navbar: stato hero → collassata interpolato sullo scroll della hero. */
export function AppHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const heroModeRef = useRef(isHeroCatalogPath(pathname));
  const rafRef = useRef(0);
  const onHeroPath = isHeroCatalogPath(pathname);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    heroModeRef.current = isHeroCatalogPath(pathname);

    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const apply = (raw: number) => {
      const p = reducedMq.matches ? (raw < 0.5 ? 0 : 1) : raw;
      header.style.setProperty('--nav-progress', p.toFixed(3));

      let hero = heroModeRef.current;
      if (p <= 0.4) hero = true;
      else if (p >= 0.58) hero = false;
      heroModeRef.current = hero;
      if (hero) header.setAttribute('data-hero', 'true');
      else header.removeAttribute('data-hero');
    };

    const measure = () => {
      rafRef.current = 0;
      apply(heroProgress());
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(measure);
    };

    apply(heroProgress());
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('nl-hero-change', schedule);
    reducedMq.addEventListener('change', schedule);

    const main = document.querySelector('main');
    const mo = main
      ? new MutationObserver(schedule)
      : null;
    mo?.observe(main as Node, { childList: true, subtree: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('nl-hero-change', schedule);
      reducedMq.removeEventListener('change', schedule);
      mo?.disconnect();
    };
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      data-hero={onHeroPath ? 'true' : undefined}
      className="group/nav nl-app-header fixed inset-x-0 top-0 z-50"
      style={{ '--nav-progress': onHeroPath ? '0' : '1' } as CSSProperties}
    >
      {children}
    </header>
  );
}
