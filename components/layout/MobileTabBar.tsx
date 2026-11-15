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

/** True when the page already has a sticky/fixed bottom action bar. */
function hideMobileTabBar(pathname: string): boolean {
  if (pathname === '/organizza' || pathname.startsWith('/organizza/')) return true;
  if (pathname.startsWith('/accedi') || pathname.startsWith('/onboarding')) return true;
  if (pathname.startsWith('/completa-registrazione')) return true;
  // Checkout / payment only — keep tab bar on Voli/Hotel search discovery
  if (
    pathname.includes('/checkout') ||
    pathname.includes('/payment') ||
    /\/prenota\/[^/]+\/(checkout|payment)/.test(pathname)
  ) {
    return true;
  }
  return false;
}

/**
 * Fixed 5-tab bar — mockup home-m / hub-viaggio-m.
 * Hidden on Organizza (sticky Continua/Crea) and checkout/payment only.
 */
export function MobileTabBar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  if (hideMobileTabBar(pathname)) {
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
