'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  {
    href: '/destinazioni',
    label: 'Destinazioni',
    match: (pathname: string) =>
      pathname === '/destinazioni' || pathname.startsWith('/itinerario'),
  },
  {
    href: '/partenze',
    label: 'Unisciti',
    match: (pathname: string) => pathname.startsWith('/partenze'),
  },
  {
    href: '/pratiche',
    label: 'I miei viaggi',
    auth: true,
    match: (pathname: string) =>
      pathname.startsWith('/pratiche') || pathname.startsWith('/pratica'),
  },
  {
    href: '/dashboard/bacheca',
    label: 'Bacheca',
    auth: true,
    match: (pathname: string) => pathname.startsWith('/dashboard/bacheca'),
  },
] as const;

function navLinkClass(active: boolean) {
  return cn(
    'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.95rem] font-medium tracking-tight transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    active
      ? 'bg-slate-900/[0.07] font-semibold text-slate-900 group-data-[hero=true]/nav:bg-white/22 group-data-[hero=true]/nav:text-white group-data-[hero=true]/nav:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]'
      : 'text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900 group-data-[hero=true]/nav:text-white/90 group-data-[hero=true]/nav:hover:bg-white/12 group-data-[hero=true]/nav:hover:text-white'
  );
}

export function NavbarNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="hidden min-w-0 items-center justify-center gap-1 md:flex lg:gap-1.5"
      aria-label="Navigazione principale"
    >
      {LINKS.filter((link) => !('auth' in link && link.auth) || isLoggedIn).map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
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
