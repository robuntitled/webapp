'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LINKS = [
  { href: '/dashboard', label: 'Esplora' },
  { href: '/dashboard/crea?new=1', label: 'Crea', auth: true },
  { href: '/prenota/voli', label: 'Servizi · Voli', auth: true },
  { href: '/prenota/hotel', label: 'Servizi · Hotel', auth: true },
  { href: '/prenota/auto', label: 'Servizi · Noleggio auto', auth: true },
  { href: '/prenota/trasporti/bus', label: 'Servizi · Bus', auth: true },
  { href: '/prenota/trasporti/treni', label: 'Servizi · Treni', auth: true },
  { href: '/prenota/trasporti/taxi', label: 'Servizi · Taxi', auth: true },
  { href: '/prenota/attrazioni', label: 'Servizi · Attrazioni', auth: true },
  { href: '/prenota/attivita', label: 'Servizi · Attività', auth: true },
  { href: '/dashboard/bacheca', label: 'Bacheca', auth: true },
  { href: '/dashboard/miei-viaggi', label: 'I miei', auth: true },
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
          <nav className="fixed top-16 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-md shadow-lg px-4 py-4 flex flex-col gap-1">
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

          </nav>
        </>
      )}
    </div>
  );
}