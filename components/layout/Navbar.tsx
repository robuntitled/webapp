import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { UserNav } from '@/components/layout/UserNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { PrenotaNavMenu } from '@/components/layout/PrenotaNavMenu';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Button } from '@/components/ui/button';
import { Heart, Plus } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';

export async function Navbar() {
  const session = await auth();
  const showCostsDashboard = isAdminEmail(session?.user?.email);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-5">
        <Link
          href={session?.user ? '/dashboard' : '/'}
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
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Esplora i Trip
          </Link>
          {session?.user && (
            <>
              <Link
                href="/dashboard/crea?new=1"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Crea un Trip
              </Link>
              <PrenotaNavMenu />
              <Link
                href="/dashboard/bacheca"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Bacheca
              </Link>
              <Link
                href="/dashboard/miei-viaggi"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                I miei viaggi
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
                  <Link href="/dashboard/crea?new=1">
                    <Plus className="h-4 w-4" />
                    Crea un Trip
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
    </header>
  );
}
