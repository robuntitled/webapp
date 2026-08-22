import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SlideshowWash } from '@/components/brand/SlideshowWash';
import { listUserPractices } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { BookingRecap } from '@/components/itineraries/BookingRecap';
import { uniqueCover } from '@/lib/composer/destination-covers';

export const dynamic = 'force-dynamic';

const MODE_LABEL = { solo: 'Da solo', friends: 'Con amici', group: 'In gruppo' } as const;

export default async function PratichePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const practices = await listUserPractices(session.user.id);

  return (
    <div className="composer-shell relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <SlideshowWash />
      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-8 px-4 py-12">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Account
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-white">I miei viaggi</h1>
        </header>
        {practices.length === 0 ? (
          <p className="text-sm text-white/70">
            Nessun viaggio ancora.{' '}
            <Link href="/destinazioni" className="font-semibold text-accent">
              Scegli un itinerario
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2">
            {practices.map((p, i) => {
              const tpl = findItineraryTemplate(p.template_id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/pratica/${p.id}`}
                    className="block overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/80 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.75)] transition hover:border-white/20"
                  >
                    <div className="relative h-52">
                      <Image
                        src={uniqueCover(tpl?.destination_slug ?? p.template_id, i)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/30 to-transparent" />
                      <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                        {MODE_LABEL[p.mode]}
                      </p>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="font-display text-2xl font-semibold text-white">
                          {tpl?.destination_name ?? p.template_id}
                          {tpl ? ` · ${tpl.duration_days} giorni` : ''}
                        </p>
                        <p className="mt-1 text-sm text-white/80">
                          {formatItDate(p.date_from)} – {formatItDate(p.date_to)}
                        </p>
                        <div className="mt-2">
                          <BookingRecap practice={p} compact />
                        </div>
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
