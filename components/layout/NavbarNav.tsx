'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_NAV } from '@/lib/brand/nav';
import { cn } from '@/lib/utils';

function navLinkClass(active: boolean) {
  return cn(
    'whitespace-nowrap rounded-full px-3 py-1 text-[0.875rem] font-medium tracking-tight transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    active
      ? 'bg-[var(--color-tint)] font-semibold text-[var(--color-brand)] group-data-[hero=true]/nav:bg-white/22 group-data-[hero=true]/nav:text-white group-data-[hero=true]/nav:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]'
      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-tint)] hover:text-[var(--color-brand)] group-data-[hero=true]/nav:text-white/90 group-data-[hero=true]/nav:hover:bg-white/12 group-data-[hero=true]/nav:hover:text-white'
  );
}

export function NavbarNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="hidden min-w-0 items-center justify-center gap-0.5 md:flex lg:gap-1"
      aria-label="Navigazione principale"
    >
      {PRIMARY_NAV.filter((link) => !('auth' in link && link.auth) || isLoggedIn).map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch={link.href === '/organizza' || link.href === '/gruppi' ? false : undefined}
            className={cn(navLinkClass(active), 'no-underline')}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
