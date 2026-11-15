'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Route, Users, Briefcase, UserRound } from 'lucide-react';
import { MOBILE_TAB_NAV } from '@/lib/brand/nav';
import { cn } from '@/lib/utils';

const ICONS = {
  esplora: Compass,
  organizza: Route,
  gruppi: Users,
  viaggi: Briefcase,
  profilo: UserRound,
} as const;

/**
 * Fixed 5-tab bar — mockup home-m / hub-viaggio-m.
 * Hidden on flows that already have a sticky/fixed bottom action bar
 * (Organizza Continua/Crea, checkout) so taps are not intercepted.
 */
export function MobileTabBar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  if (
    pathname === '/organizza' ||
    pathname.startsWith('/organizza/') ||
    pathname.startsWith('/prenota/') ||
    pathname.startsWith('/accedi') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/completa-registrazione')
  ) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-start justify-around border-t border-[var(--color-border)] bg-white pt-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navigazione principale"
      data-testid="mobile-tab-bar"
    >
      {MOBILE_TAB_NAV.map((tab) => {
        const active = tab.match(pathname);
        const needsAuth = 'auth' in tab && tab.auth;
        const href =
          needsAuth && !isLoggedIn && 'guestHref' in tab
            ? (tab.guestHref as string)
            : tab.href;
        const Icon = ICONS[tab.id as keyof typeof ICONS] ?? Compass;
        return (
          <Link
            key={tab.id}
            href={href}
            prefetch={tab.href === '/organizza' || tab.href === '/gruppi' ? false : undefined}
            className={cn(
              'flex w-[72px] flex-col items-center gap-0.5 text-xs font-semibold transition-colors',
              active ? 'text-primary' : 'text-[var(--color-text-secondary)]'
            )}
            aria-current={active ? 'page' : undefined}
            data-testid={`mobile-tab-${tab.id}`}
          >
            <Icon
              className="h-[22px] w-[22px]"
              strokeWidth={active ? 2.4 : 2}
              aria-hidden
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
