import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifiche',
  robots: { index: false, follow: false },
};

/** Centro notifiche (P2) — UI shell; live feed when available. */
export default async function NotifichePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/accedi?callbackUrl=%2Fnotifiche');
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-page,#F6F7FB)]">
      <div className="nl-page w-full space-y-4 py-8 pb-28">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-extrabold">Notifiche</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Avvisi su voli, hotel e inviti. L&apos;elenco live usa le notifiche già salvate
            sull&apos;account.
          </p>
        </header>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-tint)] text-primary">
            <Bell className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 font-semibold">Nessuna notifica da mostrare</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Quando arriva un aggiornamento sul viaggio, lo trovi qui.
          </p>
          <Link
            href="/pratiche"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
          >
            Vai a I miei viaggi →
          </Link>
        </div>
      </div>
    </div>
  );
}
