import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JoinEditionButton } from '@/components/itineraries/JoinEditionButton';
import { listOfficialEditions } from '@/lib/data/editions';
import { findItineraryBySlug, findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { parseDurationParam } from '@/lib/itineraries/params';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
};

export default async function PartenzePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { d } = await searchParams;
  const template = findItineraryBySlug(slug, parseDurationParam(d));
  if (!template) notFound();

  const editions = (await listOfficialEditions(template.template_id)).filter(
    (e) => e.status === 'open' || e.status === 'formed'
  );

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Button asChild variant="ghost" className="-ml-2">
        <Link href={`/itinerario/${slug}?d=${template.duration_days}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna al piano
        </Link>
      </Button>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          In gruppo
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Partenze ufficiali · {template.destination_name} {template.duration_days} giorni
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Date inserite da NomadLink. Non puoi aprire un gruppo pubblico con date tue.{' '}
          {COMPLIANCE_COPY.separateBooking}
        </p>
      </header>
      {editions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna edizione ufficiale aperta su questa durata. Scegli da solo o con amici, oppure
          un’altra durata.
        </p>
      ) : (
        <ul className="space-y-3">
          {editions.map((ed) => {
            const tpl = findItineraryTemplate(ed.template_id);
            return (
              <li key={ed.id} className="rounded-[10px] border border-border bg-card p-4">
                <p className="font-semibold">
                  {formatItDate(String(ed.date_from))} – {formatItDate(String(ed.date_to))}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ed.confirmed_count ?? 0}/{ed.min_confirmed} voli confermati · soglia del gruppo
                  {tpl ? ` · ${tpl.duration_days} giorni` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/edizione/${ed.id}`}>Dettaglio</Link>
                  </Button>
                  {ed.id.startsWith('seed-') ? (
                    <p className="text-xs text-muted-foreground">Seed locale: applica migration 032.</p>
                  ) : (
                    <JoinEditionButton editionId={ed.id} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
