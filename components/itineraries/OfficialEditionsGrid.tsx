import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { uniqueCover } from '@/lib/composer/destination-covers';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

/** Elenco istanze di viaggio già aperte (partenze ufficiali). */
export function OfficialEditionsGrid({ editions }: { editions: OfficialEditionCard[] }) {
  if (editions.length === 0) {
    return <p className="text-center text-sm text-white/70">Nessuna partenza aperta al momento.</p>;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {editions.map((ed, i) => {
        const tpl = findItineraryTemplate(ed.template_id);
        const cover = uniqueCover(tpl?.destination_slug ?? ed.template_id, i);
        return (
          <li
            key={ed.id}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1220]/80 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.75)]"
          >
            <div className="relative h-56 sm:h-64">
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
                  {formatItDate(ed.date_from)} – {formatItDate(ed.date_to)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <p className="text-xs font-medium text-white/70">
                {ed.confirmed_count}/{ed.min_confirmed} partecipanti confermati
              </p>
              {ed.id.startsWith('seed-') ? (
                <p className="text-xs text-white/45">Presto prenotabile</p>
              ) : (
                <Button asChild className="rounded-full">
                  <Link href={`/partenze/${ed.id}`}>Partecipa</Link>
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
