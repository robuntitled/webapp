'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/destinazioni', label: 'Destinazioni' },
  { href: '/partenze', label: 'Unisciti' },
  { href: '/pratiche', label: 'I miei viaggi', auth: true },
  { href: '/dashboard/bacheca', label: 'Bacheca', auth: true },
  { href: '/dashboard/preferiti', label: 'Preferiti', auth: true },
] as const satisfies readonly { href: string; label: string; auth?: boolean }[];

function mobileLinkClass(active: boolean) {
  return cn(
    'rounded-md px-3 py-3 text-[clamp(0.95rem,2vw,1.05rem)] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    active ? 'font-semibold text-primary' : 'text-slate-800 hover:text-primary'
  );
}

export function MobileNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/destinazioni') {
      return pathname === '/destinazioni' || pathname.startsWith('/itinerario');
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const menuBtnClass = cn(
    'h-10 w-10 rounded-full text-slate-600 transition-colors',
    'hover:bg-slate-900/[0.05] hover:text-primary',
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
            className="fixed inset-0 top-[var(--nl-nav-height)] z-40 bg-slate-950/25 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            className="fixed inset-x-0 top-[var(--nl-nav-height)] z-50 border-b border-slate-200/50 bg-white/88 py-3 backdrop-blur-md"
            aria-label="Navigazione mobile"
          >
            <div className="nl-page flex w-full flex-col gap-0.5">
              {LINKS.filter((l) => !('auth' in l && l.auth) || isLoggedIn).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={mobileLinkClass(isActive(link.href))}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
