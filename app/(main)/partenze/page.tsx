import Image from 'next/image';
import Link from 'next/link';
import { JoinEditionButton } from '@/components/itineraries/JoinEditionButton';
import { listOfficialEditions } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { coverForDestination } from '@/lib/composer/destination-covers';

export const dynamic = 'force-dynamic';

export default async function PartenzeIndexPage() {
  const editions = await listOfficialEditions();

  return (
    <div className="composer-shell min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-5xl space-y-8 px-4 py-12">
        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            In gruppo
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-white">Partenze ufficiali</h1>
          <p className="mt-3 text-white/75">
            Date già fissate. Entri e vedi i voli. Ognuno prenota col proprio fornitore.
          </p>
        </header>
        {editions.length === 0 ? (
          <p className="text-sm text-white/70">Nessuna partenza aperta.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {editions.map((ed) => {
              const tpl = findItineraryTemplate(ed.template_id);
              const cover = coverForDestination(tpl?.destination_slug ?? 'thailandia');
              return (
                <li key={ed.id} className="overflow-hidden rounded-3xl bg-[#161d2b]">
                  <div className="relative h-48">
                    <Image src={cover} alt="" fill className="object-cover" sizes="50vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-display text-2xl font-semibold text-white">
                        {tpl?.destination_name ?? ed.template_id}
                        {tpl ? ` · ${tpl.duration_days} giorni` : ''}
                      </p>
                      <p className="text-sm text-white/80">
                        {formatItDate(String(ed.date_from))} – {formatItDate(String(ed.date_to))}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <p className="text-xs text-white/60">
                      {ed.confirmed_count ?? 0}/{ed.min_confirmed} voli confermati
                    </p>
                    {tpl ? (
                      <Link
                        href={`/itinerario/${tpl.destination_slug}?d=${tpl.duration_days}`}
                        className="text-sm font-semibold text-accent"
                      >
                        Vedi piano
                      </Link>
                    ) : null}
                    {ed.id.startsWith('seed-') ? null : <JoinEditionButton editionId={ed.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
