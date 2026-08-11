'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HAMBURGER_LINKS, ROUTES } from '@/lib/nav/routes';

export function MobileNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  const links = HAMBURGER_LINKS.filter((l) => !('auth' in l && l.auth) || isLoggedIn);

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
          <nav className="fixed top-16 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur-md shadow-lg px-4 py-4 flex flex-col gap-1 max-h-[min(70vh,28rem)] overflow-y-auto">
            {!isLoggedIn ? (
              <>
                <Link
                  href={ROUTES.scopri}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Scopri
                </Link>
                <Link
                  href={ROUTES.home}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Accedi / Registrati
                </Link>
              </>
            ) : (
              links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>
        </>
      )}
    </div>
  );
}
