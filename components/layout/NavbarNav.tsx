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
    'relative whitespace-nowrap px-0.5 py-2 text-[clamp(0.9rem,0.35vw+0.82rem,1rem)] font-medium tracking-tight transition-colors',
    'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-center after:scale-x-75 after:bg-current after:opacity-0 after:transition after:duration-200',
    'hover:after:scale-x-100 hover:after:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-sm',
    active && 'font-semibold after:scale-x-100 after:opacity-75',
    'text-slate-700 hover:text-primary group-data-[hero=true]/nav:text-white/95 group-data-[hero=true]/nav:hover:text-white group-data-[hero=true]/nav:[text-shadow:0_1px_10px_rgba(0,0,0,0.4)]',
    active && 'text-primary group-data-[hero=true]/nav:text-white'
  );
}

export function NavbarNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="hidden min-w-0 items-center justify-start justify-self-start gap-5 md:flex lg:gap-8 xl:gap-10"
      aria-label="Navigazione principale"
    >
      {LINKS.filter((link) => !('auth' in link && link.auth) || isLoggedIn).map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={navLinkClass(active)}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
