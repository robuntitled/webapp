import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdminEmail } from '@/lib/admin';
import { getCostSummary } from '@/lib/api/cost-events';
import { getMonthlySpendUsdAsync } from '@/lib/ai/budget';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';

export const dynamic = 'force-dynamic';

function pct(n: number | null): string {
  if (n == null) return '—';
  return `${Math.round(n * 100)}%`;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default async function CostiDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!isAdminEmail(session.user.email)) redirect('/dashboard/impostazioni');

  const [summary, redisAiSpend] = await Promise.all([
    getCostSummary(30),
    getMonthlySpendUsdAsync(),
  ]);

  const rows = Object.entries(summary.byService).sort(
    (a, b) => b[1].costUsd - a[1].costUsd
  );

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[2]]}
        overlay="gradient"
      />
      <div className="relative z-0 container mx-auto max-w-3xl px-4 py-10 pb-24">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Admin · ultimi 30 giorni</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Costi API
            </h1>
          </div>
          <Link
            href="/dashboard/impostazioni"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Impostazioni
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-background/70 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Totale stimato
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              {usd(summary.totalCostUsd)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/70 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Places cache hit
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              {pct(summary.placesCacheHitRate)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/70 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              AI spend (Redis {summary.monthKey})
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              {usd(redisAiSpend)}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-background/70 backdrop-blur">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Servizio</th>
                <th className="px-4 py-3 font-medium">Eventi</th>
                <th className="px-4 py-3 font-medium">Network</th>
                <th className="px-4 py-3 font-medium">Cache</th>
                <th className="px-4 py-3 font-medium">Costo</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nessun evento ancora. Usa Places/AI e ricarica.
                  </td>
                </tr>
              ) : (
                rows.map(([service, stats]) => (
                  <tr key={service} className="border-b border-white/5">
                    <td className="px-4 py-3 font-medium capitalize">{service}</td>
                    <td className="px-4 py-3">{stats.events}</td>
                    <td className="px-4 py-3">{stats.network}</td>
                    <td className="px-4 py-3">{stats.cache}</td>
                    <td className="px-4 py-3">{usd(stats.costUsd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Stime: Places network ≈ $0.035/req. Imposta{' '}
          <code className="rounded bg-muted px-1">ADMIN_EMAILS</code> su Vercel
          (email separate da virgola).
        </p>
      </div>
    </div>
  );
}
