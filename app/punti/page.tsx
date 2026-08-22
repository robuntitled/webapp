import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { NOMAD_POINTS_LABEL, POINTS, PUBLIC_EARN_ACTIONS, PERKS, formatPoints } from '@/lib/commerce/points';
import Link from 'next/link';

export const metadata = {
  title: 'NomadPoints — NomadLink',
};

export default function PublicPointsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
        {NOMAD_POINTS_LABEL}
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold">Punti, non sconti in euro</h1>
      <p className="mt-4 text-lg text-slate-700">{COMPLIANCE_COPY.pointsNoMoney}</p>
      <p className="mt-3 text-slate-600">{COMPLIANCE_COPY.guide}</p>
      <ul className="mt-8 space-y-2">
        {PUBLIC_EARN_ACTIONS.map((key) => (
          <li key={key} className="flex justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            <span>{POINTS[key].label}</span>
            <span className="tabular-nums font-medium">+{formatPoints(POINTS[key].points)}</span>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-display text-2xl font-semibold">Riscatto interno</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {PERKS.map((perk) => (
          <li key={perk.id} className="rounded-2xl border border-slate-200 p-4">
            <p className="font-medium">{perk.label}</p>
            <p className="mt-1 text-sm text-slate-600">{perk.description}</p>
            <p className="mt-2 text-sm tabular-nums">{formatPoints(perk.cost)} pt</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex gap-3">
        <Link href="/destinazioni" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#0b1220]">
          Itinerari
        </Link>
        <Link href="/partenze" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold">
          Partenze
        </Link>
      </div>
    </main>
  );
}
