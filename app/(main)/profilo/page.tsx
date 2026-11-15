import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  Settings,
  Users,
} from 'lucide-react';
import { auth } from '@/auth';
import { ProfilePageClient } from '@/components/profile/ProfilePageClient';
import { getPlannerProfile } from '@/lib/data/planner-profile';
import { getUserProfile } from '@/lib/data/users';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profilo',
  robots: { index: false, follow: false },
};

const HUB_LINKS = [
  {
    href: '/profilo#viaggiatori',
    icon: Users,
    title: 'Viaggiatori e documenti',
    body: 'Anagrafica per precompilare il checkout.',
  },
  {
    href: '/profilo#ricevute',
    icon: CreditCard,
    title: 'Pagamenti e ricevute',
    body: 'Le ricevute restano nei documenti del fornitore e nelle email di conferma.',
  },
  {
    href: '/notifiche',
    icon: Bell,
    title: 'Notifiche',
    body: 'Avvisi su voli, hotel e inviti.',
  },
  {
    href: '/dashboard/impostazioni',
    icon: Settings,
    title: 'Impostazioni e privacy',
    body: 'Account, comunicazioni, elimina account.',
  },
  {
    href: '/supporto',
    icon: HelpCircle,
    title: 'Supporto',
    body: 'Domande frequenti e come funziona.',
  },
  {
    href: '/come-funziona',
    icon: FileText,
    title: 'Come funziona',
    body: 'Modello Noivia in sintesi.',
  },
] as const;

/** Profilo hub (P1-11) — safe UI fallbacks when optional profile fields are missing. */
export default async function ProfiloHubPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/accedi?callbackUrl=%2Fprofilo');
  }

  const [userProfile, plannerProfile] = await Promise.all([
    getUserProfile(session.user.id),
    getPlannerProfile(session.user.id),
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-page,#F6F7FB)]">
      <div className="nl-page w-full space-y-6 py-8 pb-28">
        <header className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Account
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Profilo
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Viaggiatori, preferenze e ricevute.
          </p>
        </header>

        <ul className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
          {HUB_LINKS.map((item) => (
            <li key={item.href} className="border-t border-[var(--color-border)] first:border-t-0">
              <Link
                href={item.href}
                className="flex min-h-14 items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--color-tint)]/60"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-tint)] text-primary">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[var(--color-text)]">
                    {item.title}
                  </span>
                  <span className="block text-xs text-[var(--color-text-secondary)]">
                    {item.body}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <section id="viaggiatori" className="scroll-mt-24 space-y-3">
          <h2 className="font-display text-lg font-extrabold">Dati profilo</h2>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
            <ProfilePageClient
              userProfile={userProfile}
              plannerProfile={plannerProfile}
              displayEmail={session.user.email}
            />
          </div>
        </section>

        <section id="ricevute" className="scroll-mt-24 rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-4 text-sm text-[var(--color-text-secondary)]">
          <p className="font-semibold text-[var(--color-text)]">Pagamenti e ricevute</p>
          <p className="mt-1">
            Conserva le email di conferma del fornitore. Un archivio ricevute in-app arriverà
            più avanti.
          </p>
        </section>
      </div>
    </div>
  );
}
