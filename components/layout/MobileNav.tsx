'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRIMARY_NAV } from '@/lib/brand/nav';
import { cn } from '@/lib/utils';

const EXTRA_AUTH_LINKS = [
  { href: '/dashboard/bacheca', label: 'Bacheca' },
  { href: '/dashboard/preferiti', label: 'Preferiti' },
] as const;

function mobileLinkClass(active: boolean) {
  return cn(
    'rounded-md px-3 py-3 text-[clamp(0.95rem,2vw,1.05rem)] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    active
      ? 'bg-[var(--color-tint)] font-semibold text-[var(--color-brand)]'
      : 'text-[var(--color-text)] hover:text-[var(--color-brand)]'
  );
}

export function MobileNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, match?: (p: string) => boolean) => {
    if (match) return match(pathname);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const menuBtnClass = cn(
    'h-11 w-11 rounded-full text-[var(--color-text-secondary)] transition-colors',
    'hover:bg-[var(--color-tint)] hover:text-[var(--color-brand)]',
    'focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    'group-data-[hero=true]/nav:text-white/90 group-data-[hero=true]/nav:hover:bg-white/10 group-data-[hero=true]/nav:hover:text-white'
  );

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-label={open ? 'Chiudi menu' : 'Apri menu'}
        className={menuBtnClass}
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-[var(--nl-nav-h,var(--nl-nav-height))] z-40 bg-slate-950/25 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            className="fixed inset-x-0 top-[var(--nl-nav-h,var(--nl-nav-height))] z-50 border-b border-[var(--color-border)] bg-white/88 py-3 backdrop-blur-md"
            aria-label="Navigazione mobile"
          >
            <div className="nl-page flex w-full flex-col gap-0.5">
              {PRIMARY_NAV.filter((l) => !('auth' in l && l.auth) || isLoggedIn).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={
                    link.href === '/organizza' || link.href === '/gruppi' ? false : undefined
                  }
                  onClick={() => setOpen(false)}
                  className={mobileLinkClass(isActive(link.href, link.match))}
                  aria-current={isActive(link.href, link.match) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
              {isLoggedIn
                ? EXTRA_AUTH_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={mobileLinkClass(isActive(link.href))}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  ))
                : null}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
