import Link from 'next/link';
import { auth } from '@/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { UserNav } from '@/components/layout/UserNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';

const navLinkClass =
  'rounded-lg px-4 py-2 text-sm font-semibold transition-colors text-slate-700 hover:bg-slate-100 hover:text-primary group-data-[hero=true]/nav:text-white group-data-[hero=true]/nav:hover:bg-white/15 group-data-[hero=true]/nav:hover:text-white';

export async function Navbar() {
  const session = await auth();
  const showCostsDashboard = isAdminEmail(session?.user?.email);

  return (
    <AppHeader>
      <div className="nl-page flex h-16 w-full items-center justify-between">
        <Link
          href="/destinazioni"
          className="group shrink-0 transition-transform hover:scale-[1.03]"
          aria-label="Bradigo — home"
        >
          <BrandLogo
            size={52}
            className="ring-white/90 group-data-[hero=true]/nav:ring-white/50"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/destinazioni" className={navLinkClass}>
            Itinerari
          </Link>
          {session?.user && (
            <>
              <Link href="/pratiche" className={navLinkClass}>
                I miei viaggi
              </Link>
              <Link href="/dashboard/bacheca" className={navLinkClass}>
                Bacheca
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <MobileNav isLoggedIn={!!session?.user} />
          {session?.user ? (
            <>
              <Link href="/pratiche" className="hidden sm:block" title="I miei viaggi">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-accent hover:bg-accent/10 hover:text-accent group-data-[hero=true]/nav:hover:bg-white/15"
                >
                  <Heart className="h-5 w-5 fill-accent drop-shadow" />
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
                className="font-semibold text-slate-700 hover:bg-slate-100 hover:text-primary group-data-[hero=true]/nav:text-white group-data-[hero=true]/nav:hover:bg-white/15 group-data-[hero=true]/nav:hover:text-white"
              >
                <Link href="/">Accedi</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-accent font-semibold text-white hover:bg-accent/90"
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
