import Link from 'next/link';
import { auth } from '@/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { NavbarNav } from '@/components/layout/NavbarNav';
import { UserNav } from '@/components/layout/UserNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';
import { cn } from '@/lib/utils';

const iconBtnClass = cn(
  'h-10 w-10 shrink-0 rounded-full text-slate-600 transition-colors',
  'hover:bg-slate-900/[0.05] hover:text-primary',
  'focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  'group-data-[hero=true]/nav:text-white/90 group-data-[hero=true]/nav:hover:bg-white/10 group-data-[hero=true]/nav:hover:text-white'
);

export async function Navbar() {
  const session = await auth();
  const showCostsDashboard = isAdminEmail(session?.user?.email);

  return (
    <AppHeader>
      <div className="nl-page nl-nav-inner grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8 lg:gap-12">
        <Link
          href="/destinazioni"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label="Flygetr — home"
        >
          <BrandLogo responsive priority />
        </Link>

        <NavbarNav isLoggedIn={!!session?.user} />

        <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1 md:gap-1.5">
          <MobileNav isLoggedIn={!!session?.user} />
          {session?.user ? (
            <>
              <Link
                href="/pratiche"
                className="hidden sm:block"
                aria-label="I miei viaggi"
              >
                <Button variant="ghost" size="icon" className={iconBtnClass}>
                  <Heart className="h-[1.15rem] w-[1.15rem] fill-accent text-accent group-data-[hero=true]/nav:drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]" />
                </Button>
              </Link>
              <NotificationBell />
              <UserNav user={session.user} showCostsDashboard={showCostsDashboard} />
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  'h-9 rounded-full px-4 font-medium text-slate-700 hover:bg-slate-900/[0.05] hover:text-primary',
                  'group-data-[hero=true]/nav:text-white/95 group-data-[hero=true]/nav:hover:bg-white/10 group-data-[hero=true]/nav:hover:text-white group-data-[hero=true]/nav:[text-shadow:0_1px_8px_rgba(0,0,0,0.35)]'
                )}
              >
                <Link href="/">Accedi</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full bg-accent px-4 font-semibold text-white shadow-none hover:bg-accent/90"
              >
                <Link href="/">Registrati</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppHeader>
  );
}
