'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LINKS = [
  { href: '/destinazioni', label: 'Itinerari' },
  { href: '/pratiche', label: 'I miei viaggi', auth: true },
  { href: '/dashboard/bacheca', label: 'Bacheca', auth: true },
  { href: '/dashboard/preferiti', label: 'Preferiti', auth: true },
] as const satisfies readonly { href: string; label: string; auth?: boolean }[];

export function MobileNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? 'Chiudi menu' : 'Apri menu'}
        className="text-slate-700 hover:bg-slate-100 hover:text-primary"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed top-16 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-md shadow-lg py-4">
            <div className="nl-page flex w-full flex-col gap-1">
            {LINKS.filter((l) => !('auth' in l && l.auth) || isLoggedIn).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
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