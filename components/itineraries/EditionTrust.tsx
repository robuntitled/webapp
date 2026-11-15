import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import type { EditionHost } from '@/lib/data/editions';
import { profilePath } from '@/lib/profile/paths';

export function CuratedEditionBadge() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-[var(--color-tint)] p-4">
      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-semibold text-foreground">Partenza in arrivo</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Le partenze di gruppo sono organizzate da un tour operator autorizzato quando
          disponibili. Finché sono «In arrivo» non ci si può ancora iscrivere.
        </p>
      </div>
    </div>
  );
}

export function EditionHostCard({ host }: { host: EditionHost }) {
  const path = profilePath(host.username, host.userId);
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Creato da
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <UserProfileLink
          userId={host.userId}
          username={host.username}
          firstName={host.firstName}
          lastName={host.lastName}
          image={host.image}
        />
        <div className="text-right">
          {/* Stelle tra persone nascoste (Legale PRO) — solo «Nuovo su Noivia» */}
          <p className="text-xs text-muted-foreground">Nuovo su Noivia</p>
          {path ? (
            <Link href={path} className="text-xs font-semibold text-primary hover:underline">
              Vedi profilo
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Stelle tra persone nascoste (Legale PRO) — componente no-op. */
export function MemberRatingBadge(_props: {
  avg: number | null;
  count: number;
}) {
  return null;
}
