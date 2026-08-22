import Link from 'next/link';
import Image from 'next/image';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { itineraryPath } from '@/lib/itineraries/params';
import { formatItDate } from '@/lib/itineraries/dates';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import type { EditionRow } from '@/lib/data/editions';

export function CatalogHome({
  destinations,
  editions,
}: {
  destinations: { slug: string; name: string; vibe: string; emoji: string; allowedDurations: number[] }[];
  editions: EditionRow[];
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-12 px-4 py-12">
      <header className="mx-auto max-w-2xl rounded-[10px] bg-background/85 px-4 py-6 text-center backdrop-blur-sm">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Itinerari
        </p>
        <h1 className="font-display text-[clamp(1.6rem,4vw,2.6rem)] font-semibold leading-tight">
          Scegli il piano. Poi come parti.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Template ufficiali NomadLink. {COMPLIANCE_COPY.notAPackage} {COMPLIANCE_COPY.separateBooking}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((dest) => {
          const cover = coverForDestination(dest.slug);
          return (
            <Link
              key={dest.slug}
              href={itineraryPath(dest.slug)}
              className="group overflow-hidden rounded-[10px] border border-border bg-card"
            >
              <div className="relative h-44">
                <Image
                  src={cover}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-[1.03]"
                  sizes="400px"
                />
              </div>
              <div className="space-y-2 p-4">
                <p className="font-display text-xl font-semibold">
                  {dest.emoji} {dest.name}
                </p>
                <p className="text-sm text-muted-foreground">{dest.vibe}</p>
                <p className="text-xs font-medium text-accent">
                  {dest.allowedDurations.join(' / ')} giorni
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      <section
        id="partenze"
        className="scroll-mt-24 space-y-4 rounded-[10px] bg-background/85 p-4 backdrop-blur-sm"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Secondario
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Partenze di gruppo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Date ufficiali già aperte. Non si creano gruppi pubblici con date libere.
          </p>
        </div>
        {editions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna partenza ufficiale aperta.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {editions.map((ed) => {
              const tpl = findItineraryTemplate(ed.template_id);
              return (
                <li key={ed.id} className="rounded-[10px] border border-border bg-card p-4">
                  <p className="font-semibold">
                    {tpl?.destination_name ?? ed.template_id} · {tpl?.duration_days} giorni
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatItDate(String(ed.date_from))} – {formatItDate(String(ed.date_to))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ed.confirmed_count ?? 0}/{ed.min_confirmed} partecipanti confermati · {ed.status}
                  </p>
                  <Link
                    href={`/edizione/${ed.id}`}
                    className="mt-3 inline-block text-sm font-semibold text-accent underline-offset-4 hover:underline"
                  >
                    Vedi partenza
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
