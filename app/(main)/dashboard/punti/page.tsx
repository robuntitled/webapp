import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  NOMAD_POINTS_LABEL,
  POINTS,
  PUBLIC_EARN_ACTIONS,
  formatPoints,
  progressToNextTier,
  type PointsAction,
} from '@/lib/commerce/points';
import { listPointsForUser, getPointsBalance } from '@/lib/commerce/points-ledger';
import { RedeemPerks } from '@/components/commerce/RedeemPerks';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

export const metadata = {
  title: 'I miei NomadPoints — NomadLink',
};

const ACTION_LABEL: Record<PointsAction | 'redeem', string> = {
  create_trip_published: POINTS.create_trip_published.label,
  group_formed: POINTS.group_formed.label,
  group_doubled: POINTS.group_doubled.label,
  invite_register: POINTS.invite_register.label,
  invite_join_trip: POINTS.invite_join_trip.label,
  invite_trip_departed: POINTS.invite_trip_departed.label,
  joined_trip: POINTS.joined_trip.label,
  referral_join: POINTS.referral_join.label,
  review_written: POINTS.review_written.label,
  review_verified: POINTS.review_verified.label,
  profile_completed: POINTS.profile_completed.label,
  day90_bonus: POINTS.day90_bonus.label,
  redeem: 'Riscatto perk',
};

export default async function PointsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const rows = await listPointsForUser(session.user.id);
  const total = await getPointsBalance(session.user.id);
  const { current, next, ratio, remaining } = progressToNextTier(total);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
          {NOMAD_POINTS_LABEL}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground">I miei NomadPoints</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Guadagni punti per azioni: creare, soglia del gruppo, inviti, profilo, recensioni.{' '}
          {COMPLIANCE_COPY.pointsNoMoney}
        </p>

        <div className="mt-8 rounded-[10px] border border-border bg-card p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-5xl font-semibold tabular-nums text-foreground">
                {formatPoints(total)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">punti disponibili</p>
            </div>
            <span className="rounded-[8px] border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
              {current.label}
            </span>
          </div>

          {next ? (
            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatPoints(remaining)} punti a <strong className="text-foreground">{next.label}</strong>{' '}
                — {next.perkBoost}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Livello massimo raggiunto — {current.perkBoost}.
            </p>
          )}
        </div>

        <h2 className="mt-10 font-display text-2xl font-semibold text-foreground">Riscatta in perk</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo vantaggi interni. Per i boost incolla l’ID del Trip (nella pagina del viaggio).
        </p>
        <div className="mt-4">
          <RedeemPerks balance={total} />
        </div>

        <h2 className="mt-10 font-display text-2xl font-semibold text-foreground">Come guadagni</h2>
        <ul className="mt-4 space-y-2">
          {(PUBLIC_EARN_ACTIONS as PointsAction[]).map((key) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-[10px] border border-border bg-card px-4 py-3 text-sm text-foreground"
            >
              <span>{POINTS[key].label}</span>
              <span className="tabular-nums font-medium text-accent">
                +{formatPoints(POINTS[key].points)}
              </span>
            </li>
          ))}
        </ul>

        {rows.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-2xl font-semibold text-foreground">Attività</h2>
            <ul className="mt-4 space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-[10px] border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <span>{ACTION_LABEL[row.action] ?? row.action}</span>
                  <span
                    className={`tabular-nums font-medium ${row.points >= 0 ? 'text-accent' : 'text-muted-foreground'}`}
                  >
                    {row.points >= 0 ? '+' : ''}
                    {formatPoints(Math.abs(row.points))}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="rounded-full">
            <Link href="/dashboard/creator">Per i Creator</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard/miei-viaggi">I miei viaggi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
