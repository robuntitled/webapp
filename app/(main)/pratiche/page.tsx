import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listUserPractices } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { coverForDestination } from '@/lib/composer/destination-covers';

export const dynamic = 'force-dynamic';

export default async function PratichePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const practices = await listUserPractices(session.user.id);

  return (
    <div className="composer-shell min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-5xl space-y-8 px-4 py-12">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Account
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-white">Le mie pratiche</h1>
        </header>
        {practices.length === 0 ? (
          <p className="text-sm text-white/70">
            Nessuna pratica.{' '}
            <Link href="/destinazioni" className="font-semibold text-accent">
              Scegli un itinerario
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {practices.map((p) => {
              const tpl = findItineraryTemplate(p.template_id);
              return (
                <li key={p.id}>
                  <Link href={`/pratica/${p.id}`} className="block overflow-hidden rounded-3xl bg-[#161d2b]">
                    <div className="relative h-40">
                      <Image
                        src={coverForDestination(tpl?.destination_slug ?? 'thailandia')}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="font-display text-xl font-semibold text-white">
                          {tpl?.destination_name ?? p.template_id}
                        </p>
                        <p className="text-sm text-white/80">
                          {formatItDate(p.date_from)} – {formatItDate(p.date_to)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
