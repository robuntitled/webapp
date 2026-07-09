import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { UserNav } from '@/components/layout/UserNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Heart, Plus } from 'lucide-react';

export async function Navbar() {
  const session = await auth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
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
            Scopri viaggi
          </Link>
          {session?.user && (
            <>
              <Link
                href="/dashboard/crea"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Componi viaggio
              </Link>
              <Link
                href="/dashboard/miei-viaggi"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                I Miei Viaggi
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <MobileNav isLoggedIn={!!session?.user} />
          {session?.user ? (
            <>
              <Link href="/dashboard/preferiti" className="hidden sm:block">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Heart className="h-5 w-5 text-accent" />
                </Button>
              </Link>
              {session.user && (
                <Button asChild size="sm" className="hidden md:inline-flex rounded-full gap-1.5">
                  <Link href="/dashboard/crea">
                    <Plus className="h-4 w-4" />
                    Componi
                  </Link>
                </Button>
              )}
              <UserNav user={session.user} />
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href="/">Accedi</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/">Registrati</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}