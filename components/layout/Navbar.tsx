import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { UserNav } from '@/components/layout/UserNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Button } from '@/components/ui/button';
import { Heart, Map } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';

export async function Navbar() {
  const session = await auth();
  const showCostsDashboard = isAdminEmail(session?.user?.email);

  return (
    <AppHeader>
      <div className="container mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-5">
        <Link
          href="/destinazioni"
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

        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/destinazioni"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Itinerari
          </Link>
          {session?.user && (
            <>
              <Link
                href="/partenze"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Partenze
              </Link>
              <Link
                href="/pratiche"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                I miei viaggi
              </Link>
              <Link
                href="/dashboard/bacheca"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Bacheca
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <MobileNav isLoggedIn={!!session?.user} />
          {session?.user ? (
            <>
              <Link href="/dashboard/preferiti" className="hidden sm:block">
                <Button variant="ghost" size="icon">
                  <Heart className="h-5 w-5 text-accent" />
                </Button>
              </Link>
              <NotificationBell />
              {session.user && (
                <Button asChild size="sm" className="hidden md:inline-flex gap-1.5">
                  <Link href="/destinazioni">
                    <Map className="h-4 w-4" />
                    Itinerari
                  </Link>
                </Button>
              )}
              <UserNav
                user={session.user}
                showCostsDashboard={showCostsDashboard}
              />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Accedi</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/">Registrati</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppHeader>
  );
}
