import Link from 'next/link';
import Image from 'next/image';
import { auth } from '../../auth';
import { UserNav } from './UserNav';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export async function Navbar() {
  const session = await auth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        
        <Link href={session?.user ? "/dashboard" : "/"} className="flex items-center space-x-2">
          <Image src="/assets/logo.png" alt="NomadLink Logo" width={32} height={32} />
          <span className="font-bold text-lg">NomadLink</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {/* --- MODIFICA QUI --- */}
          <Link href="/dashboard" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            Cerca Viaggi
          </Link>
          {session?.user && (
            <>
              <Link href="/dashboard/crea" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                Crea un Viaggio
              </Link>
              <Link href="/dashboard/miei-viaggi" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                I Miei Viaggi
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-2">
          {session?.user ? (
            <>
              <Link href="/dashboard/preferiti">
                <Button variant="ghost" size="icon">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
              <UserNav user={session.user} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost"><Link href="/">Accedi</Link></Button>
              <Button asChild><Link href="/">Registrati</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}