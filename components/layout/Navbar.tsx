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
      <div className="nl-page flex h-16 w-full items-center justify-between">
        <Link href="/destinazioni" className="group flex items-center gap-2.5">
          <Image
            src="/assets/logo.png"
            alt="NomadLink"
            width={36}
            height={36}
            className="rounded-lg transition-transform group-hover:scale-105"
          />
          <span className="font-display text-xl font-semibold tracking-tight text-primary">
            NomadLink
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/destinazioni"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
          >
            Itinerari
          </Link>
          {session?.user && (
            <>
              <Link
                href="/pratiche"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
              >
                I miei viaggi
              </Link>
              <Link
                href="/dashboard/bacheca"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
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
              <Link href="/pratiche" className="hidden sm:block" title="I miei viaggi">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-accent hover:bg-accent/10 hover:text-accent"
                >
                  <Heart className="h-5 w-5 fill-accent" />
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
                className="font-semibold text-slate-700 hover:bg-slate-100 hover:text-primary"
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
