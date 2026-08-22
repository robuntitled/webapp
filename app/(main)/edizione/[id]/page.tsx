import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JoinEditionButton } from '@/components/itineraries/JoinEditionButton';
import { getEdition } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { itineraryPath } from '@/lib/itineraries/params';
import { COMPLIANCE_COPY, groupThresholdCopy } from '@/lib/legal/compliance-copy';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EdizionePage({ params }: PageProps) {
  const { id } = await params;
  const edition = await getEdition(id);
  if (!edition) notFound();
  const template = findItineraryTemplate(edition.template_id);
  const confirmed = edition.confirmed_count ?? 0;
  const formed = confirmed >= edition.min_confirmed;

  return (
    <div className="nl-page w-full space-y-6 py-10">
      <Button asChild variant="ghost" className="-ml-2">
        <Link href={template ? itineraryPath(template.destination_slug, template.duration_days) : '/destinazioni'}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Piano
        </Link>
      </Button>
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          {edition.edition_type === 'official' ? 'Edizione ufficiale' : 'Edizione privata'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          {template?.destination_name ?? edition.template_id}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {formatItDate(String(edition.date_from))} – {formatItDate(String(edition.date_to))}
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        {groupThresholdCopy(edition.min_confirmed, formed, 'flights')}
      </p>
      <p className="text-sm text-muted-foreground">
        Posto confermato = volo prenotato. {COMPLIANCE_COPY.separateBooking} Hotel e attività dopo
        la soglia dei voli.
      </p>
      {edition.id.startsWith('seed-') ? (
        <p className="text-sm text-amber-700">
          Seed locale: applica `npm run db:practices` per unirti.
        </p>
      ) : (
        <JoinEditionButton editionId={edition.id} />
      )}
    </div>
  );
}
