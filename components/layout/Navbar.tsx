import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { UserNav } from '@/components/layout/UserNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';

export async function Navbar() {
  const session = await auth();
  const showCostsDashboard = isAdminEmail(session?.user?.email);

  return (
    <AppHeader>
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4">
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
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            NomadLink
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/destinazioni"
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Itinerari
          </Link>
          {session?.user && (
            <>
              <Link
                href="/pratiche"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                I miei viaggi
              </Link>
              <Link
                href="/dashboard/bacheca"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 hover:text-white"
                >
                  <Heart className="h-5 w-5 text-accent" />
                </Button>
              </Link>
              <NotificationBell />
              <UserNav
                user={session.user}
                showCostsDashboard={showCostsDashboard}
              />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/">Accedi</Link>
              </Button>
              <Button asChild size="sm" className="bg-accent text-white hover:bg-accent/90">
                <Link href="/">Registrati</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppHeader>
  );
}
