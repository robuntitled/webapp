import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listUserPractices } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';

export const dynamic = 'force-dynamic';

export default async function PratichePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const practices = await listUserPractices(session.user.id);

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Account
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Le mie pratiche</h1>
      </header>
      {practices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna pratica. Scegli un{' '}
          <Link href="/destinazioni" className="font-semibold underline">
            itinerario
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {practices.map((p) => {
            const tpl = findItineraryTemplate(p.template_id);
            return (
              <li key={p.id}>
                <Link
                  href={`/pratica/${p.id}`}
                  className="block rounded-[10px] border border-border bg-card p-4 hover:bg-muted"
                >
                  <p className="font-semibold">{tpl?.destination_name ?? p.template_id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatItDate(p.date_from)} – {formatItDate(p.date_to)} · {p.mode} · {p.status}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
