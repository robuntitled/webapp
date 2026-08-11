import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { UserNav } from '@/components/layout/UserNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Button } from '@/components/ui/button';
import { Heart, Plus } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';
import { DESKTOP_SHORTCUTS, ROUTES } from '@/lib/nav/routes';

export async function Navbar() {
  const session = await auth();
  const showCostsDashboard = isAdminEmail(session?.user?.email);
  const loggedIn = !!session?.user;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href={loggedIn ? ROUTES.hub : ROUTES.home}
          className="flex items-center gap-2.5 group"
        >
          <Image
            src="/assets/logo.png"
            alt="NomadLink"
            width={36}
            height={36}
            className="rounded-lg transition-transform group-hover:scale-105"
          />
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            NomadLink
          </span>
        </Link>

        {/* Desktop: Hub + shortcut fissi (loggato) */}
        <nav className="hidden md:flex items-center gap-1">
          {loggedIn ? (
            <>
              <Link
                href={ROUTES.hub}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Hub
              </Link>
              {DESKTOP_SHORTCUTS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </>
          ) : (
            <Link
              href={ROUTES.scopri}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Scopri
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <MobileNav isLoggedIn={loggedIn} />
          {loggedIn ? (
            <>
              <Link href={ROUTES.preferiti} className="hidden sm:block">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Heart className="h-5 w-5 text-accent" />
                </Button>
              </Link>
              <NotificationBell />
              <Button asChild size="sm" className="hidden md:inline-flex rounded-full gap-1.5">
                <Link href={`${ROUTES.organizza}?new=1`}>
                  <Plus className="h-4 w-4" />
                  Organizza
                </Link>
              </Button>
              <UserNav
                user={session.user}
                showCostsDashboard={showCostsDashboard}
              />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href={ROUTES.home}>Accedi</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link href={ROUTES.home}>Inizia</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
