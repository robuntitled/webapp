import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdminEmail } from '@/lib/admin';
import { getAdminCostHub } from '@/lib/admin/provider-hub';
import { AdminCostsHub } from '@/components/admin/AdminCostsHub';
import { ResolveReconciliationButton } from '@/components/admin/ResolveReconciliationButton';
import {
  countPendingBookingReconciliations,
  listPendingBookingReconciliations,
} from '@/lib/data/booking-reconciliation';

export const dynamic = 'force-dynamic';

export default async function CostiDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!isAdminEmail(session.user.email)) redirect('/dashboard/impostazioni');

  const hub = await getAdminCostHub(30);
  const [{ count: pendingCount, tableReady }, { rows: pendingRows }] =
    await Promise.all([
      countPendingBookingReconciliations(),
      listPendingBookingReconciliations(20),
    ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full py-10 pb-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="nl-hero-subtitle text-sm">Admin · hub live</p>
            <h1 className="nl-hero-title font-display text-3xl font-semibold tracking-tight">
              Costi e provider
            </h1>
          </div>
          <Link
            href="/dashboard/impostazioni"
            className="text-sm text-primary underline-offset-4 hover:text-[var(--color-primary-hover)] hover:underline"
          >
            Impostazioni
          </Link>
        </div>

        <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
          <h2 className="font-display text-lg font-semibold text-amber-950">
            Prenotazioni da riconciliare
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            Pagamento/provider ok ma salvataggio pratica fallito. Follow-up manuale.
            {!tableReady
              ? ' Tabella non ancora migrata (042_booking_reconciliation.sql) — i casi restano nei log.'
              : ` ${pendingCount} in coda.`}
          </p>
          {pendingRows.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-amber-950">
              {pendingRows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-amber-200/80 bg-white/70 px-3 py-2 font-mono text-xs"
                >
                  <span className="font-sans font-semibold uppercase tracking-wide">
                    {r.kind}
                  </span>{' '}
                  · id {r.provider_booking_id ?? '—'} · ref{' '}
                  {r.provider_booking_ref ?? '—'} · pratica {r.practice_id ?? '—'} ·{' '}
                  {new Date(r.created_at).toLocaleString('it-IT')}
                  {r.last_error ? (
                    <span className="mt-1 block font-sans text-amber-800/90">
                      {r.last_error}
                    </span>
                  ) : null}
                  <ResolveReconciliationButton id={r.id} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <AdminCostsHub initial={hub} />
      </div>
    </div>
  );
}
