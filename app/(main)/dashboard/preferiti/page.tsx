import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Heart } from 'lucide-react';
import { loadFavoriteItineraryIds } from '@/lib/data/favorites';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { itineraryPath } from '@/lib/itineraries/params';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { Button } from '@/components/ui/button';

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const ids = await loadFavoriteItineraryIds(session.user.id);
  const templates = [...ids]
    .map((id) => findItineraryTemplate(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="nl-page w-full py-12">
      <div className="mb-8 flex items-center gap-3">
        <Heart className="h-8 w-8 text-red-500" />
        <h1 className="text-4xl font-bold">I tuoi itinerari preferiti</h1>
      </div>

      {templates.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t, index) => {
            const cover = uniqueCover(t.destination_slug, index);
            return (
              <li key={t.template_id}>
                <Link
                  href={itineraryPath(t.destination_slug, t.duration_days)}
                  className="group relative block overflow-hidden rounded-2xl ring-1 ring-black/8"
                >
                  <div className="relative aspect-[16/10] w-full">
                    <Image
                      src={cover}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3.5">
                      <p className="font-display text-base font-semibold text-white line-clamp-1">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-white/90">
                        {t.destination_name} · {t.duration_days} giorni · budget orientativo{' '}
                        {t.budget_orientative_eur.total_hint}€
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-xl font-semibold">Nessun itinerario salvato.</p>
          <p className="mt-2 text-slate-500">
            Apri un piano e tocca il cuore per ritrovarlo qui.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/destinazioni">Esplora itinerari</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
