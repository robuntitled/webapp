import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isAdminEmail } from '@/lib/admin';
import { getAdminCostHub } from '@/lib/admin/provider-hub';
import { AdminCostsHub } from '@/components/admin/AdminCostsHub';

export const dynamic = 'force-dynamic';

export default async function CostiDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  if (!isAdminEmail(session.user.email)) redirect('/dashboard/impostazioni');

  const hub = await getAdminCostHub(30);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 pb-24">
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

        <AdminCostsHub initial={hub} />
      </div>
    </div>
  );
}
