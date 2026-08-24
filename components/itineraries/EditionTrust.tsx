import Link from 'next/link';
import { BadgeCheck, Star } from 'lucide-react';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import type { EditionHost } from '@/lib/data/editions';
import { profilePath } from '@/lib/profile/paths';

export function CuratedEditionBadge() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent/5 p-4">
      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <div>
        <p className="text-sm font-semibold text-foreground">Partenza ufficiale curata</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Itinerario verificato, soglia gruppo reale e chat dopo il primo volo confermato.
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
        Organizzatore
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
          {host.ratingAvg != null && host.ratingCount > 0 ? (
            <p className="flex items-center justify-end gap-1 text-sm font-semibold text-foreground">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {host.ratingAvg.toFixed(1)}
              <span className="font-normal text-muted-foreground">
                ({host.ratingCount})
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Nuovo organizer</p>
          )}
          {path ? (
            <Link href={path} className="text-xs font-semibold text-accent hover:underline">
              Vedi profilo
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MemberRatingBadge({
  avg,
  count,
}: {
  avg: number | null;
  count: number;
}) {
  if (avg == null || count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      {avg.toFixed(1)}
    </span>
  );
}
