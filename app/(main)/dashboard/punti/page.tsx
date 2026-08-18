import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import {
  NOMAD_POINTS_LABEL,
  POINTS,
  PERKS,
  formatPoints,
  progressToNextTier,
  type PointsAction,
} from '@/lib/commerce/points';
import { listPointsForUser, sumPoints } from '@/lib/commerce/points-ledger';

export const metadata = {
  title: 'I miei NomadPoints — NomadLink',
};

const ACTION_LABEL: Record<PointsAction | 'redeem', string> = {
  create_trip_published: POINTS.create_trip_published.label,
  group_formed: POINTS.group_formed.label,
  referral_join: POINTS.referral_join.label,
  joined_trip: POINTS.joined_trip.label,
  review_written: POINTS.review_written.label,
  profile_completed: POINTS.profile_completed.label,
  redeem: 'Riscatto perk',
};

export default async function PointsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const rows = await listPointsForUser(session.user.id);
  const total = sumPoints(rows);
  const { current, next, ratio, remaining } = progressToNextTier(total);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground images={[BRAND_IMAGES.heroes.dashboard]} overlay="gradient" />
      <div className="relative z-10 container mx-auto max-w-2xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
          {NOMAD_POINTS_LABEL}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">I miei NomadPoints</h1>
        <p className="mt-4 text-lg text-white/90">
          Guadagni punti per quello che fai sulla piattaforma: creare viaggi, far partire il gruppo,
          invitare, unirti, recensire. Non sono denaro né cashback: si riscattano solo in perk di
          NomadLink.
        </p>

        <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-display text-5xl font-semibold tabular-nums text-white">
                {formatPoints(total)}
              </p>
              <p className="mt-1 text-sm text-white/80">punti disponibili</p>
            </div>
            <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-sm font-medium text-white">
              {current.label}
            </span>
          </div>

          {next ? (
            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-white/80">
                {formatPoints(remaining)} punti a <strong className="text-white">{next.label}</strong>{' '}
                — {next.perkBoost}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-white/80">
              Livello massimo raggiunto — {current.perkBoost}.
            </p>
          )}
        </div>

        <h2 className="mt-10 font-display text-2xl font-semibold text-white">Riscatta in perk</h2>
        <p className="mt-1 text-sm text-white/70">
          Vantaggi di piattaforma. Il riscatto arriva a breve.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {PERKS.map((perk) => {
            const affordable = total >= perk.cost;
            return (
              <li
                key={perk.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>
                    {perk.emoji}
                  </span>
                  <span className="tabular-nums text-sm font-semibold text-accent">
                    {formatPoints(perk.cost)} pt
                  </span>
                </div>
                <p className="mt-2 font-medium">{perk.label}</p>
                <p className="mt-1 text-sm text-white/70">{perk.description}</p>
                <span className="mt-3 inline-block text-xs text-white/60">
                  {affordable ? 'Disponibile · riscatto in arrivo' : 'Continua a guadagnare punti'}
                </span>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-10 font-display text-2xl font-semibold text-white">Come guadagni</h2>
        <ul className="mt-4 space-y-2">
          {(Object.keys(POINTS) as PointsAction[]).map((key) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
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
            <h2 className="mt-10 font-display text-2xl font-semibold text-white">Attività</h2>
            <ul className="mt-4 space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                >
                  <span>{ACTION_LABEL[row.action] ?? row.action}</span>
                  <span
                    className={`tabular-nums font-medium ${row.points >= 0 ? 'text-accent' : 'text-white/70'}`}
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
