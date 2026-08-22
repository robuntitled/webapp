import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PracticeChecklist } from '@/components/itineraries/PracticeChecklist';
import { getPractice } from '@/lib/data/practices';
import { getEdition } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';
import { itineraryPath } from '@/lib/itineraries/params';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';

type PageProps = {
  params: Promise<{ id: string }>;
};

const MODE_LABEL = { solo: 'Da solo', friends: 'Con amici', group: 'In gruppo' } as const;

export default async function PraticaPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const practice = await getPractice(id, session.user.id);
  if (!practice) notFound();
  const template = findItineraryTemplate(practice.template_id);
  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Button asChild variant="ghost" className="-ml-2">
        <Link href="/pratiche">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Le mie pratiche
        </Link>
      </Button>
      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge>{MODE_LABEL[practice.mode]}</Badge>
          <Badge variant="secondary">{practice.status}</Badge>
        </div>
        <h1 className="font-display text-3xl font-semibold">
          {template?.destination_name ?? practice.template_id}
        </h1>
        <p className="text-muted-foreground">
          {formatItDate(practice.date_from)} – {formatItDate(practice.date_to)}
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        {COMPLIANCE_COPY.budgetLabel}: stima, non prezzo del viaggio.{' '}
        {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
      </p>
      {template ? (
        <Link
          href={itineraryPath(template.destination_slug, template.duration_days)}
          className="inline-block text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          Vedi il piano
        </Link>
      ) : null}
      {edition?.invite_token ? (
        <p className="rounded-[10px] border border-border bg-card p-4 text-sm">
          Invito amici:{' '}
          <Link href={`/invito/${edition.invite_token}`} className="font-semibold underline">
            /invito/{edition.invite_token}
          </Link>
        </p>
      ) : null}
      <PracticeChecklist practice={practice} />
    </div>
  );
}
