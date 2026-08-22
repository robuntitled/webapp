import Image from 'next/image';
import Link from 'next/link';
import { SlideshowWash } from '@/components/brand/SlideshowWash';
import { JoinEditionButton } from '@/components/itineraries/JoinEditionButton';
import { listOfficialEditions } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { uniqueCover } from '@/lib/composer/destination-covers';

export const dynamic = 'force-dynamic';

export default async function PartenzeIndexPage() {
  const editions = await listOfficialEditions();

  return (
    <div className="composer-shell relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <SlideshowWash />
      <div className="relative z-10 container mx-auto max-w-5xl space-y-8 px-4 py-12">
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
          <ul className="grid gap-5 sm:grid-cols-2">
            {editions.map((ed, i) => {
              const tpl = findItineraryTemplate(ed.template_id);
              const cover = uniqueCover(tpl?.destination_slug ?? ed.template_id, i);
              return (
                <li
                  key={ed.id}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/80 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.75)]"
                >
                  <div className="relative h-64">
                    <Image src={cover} alt="" fill className="object-cover" sizes="50vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/35 to-transparent" />
                    {tpl ? (
                      <p className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                        {tpl.duration_days} giorni
                      </p>
                    ) : null}
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="font-display text-2xl font-semibold text-white">
                        {tpl?.destination_name ?? ed.template_id}
                      </p>
                      <p className="mt-1 text-sm text-white/80">
                        {formatItDate(String(ed.date_from))} – {formatItDate(String(ed.date_to))}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                    <p className="text-xs font-medium text-white/70">
                      {ed.confirmed_count ?? 0}/{ed.min_confirmed} partecipanti confermati
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
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
