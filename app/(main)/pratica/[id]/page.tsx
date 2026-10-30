import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TripWorkspace } from '@/components/itineraries/workspace/TripWorkspace';
import { getPractice } from '@/lib/data/practices';
import { getEdition, listEditionMembers } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; step?: string; stay?: string }>;
};

export default async function PraticaPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const { tab, step, stay } = await searchParams;
  const practice = await getPractice(id, session.user.id);
  if (!practice) notFound();
  const template = findItineraryTemplate(practice.template_id);
  if (!template) notFound();
  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;
  const members = practice.edition_id
    ? await listEditionMembers(practice.edition_id, { withRatings: true })
    : [];

  // Mostra Rinomina anche senza migration 041 / created_by legacy.
  // Il salvataggio resta soft-fail se la colonna title manca.
  const canRename = Boolean(
    practice.edition_id &&
      ((edition?.created_by != null && edition.created_by === session.user.id) ||
        (edition?.edition_type === 'private' && !edition.created_by) ||
        (!edition && practice.mode === 'friends'))
  );

  return (
    <TripWorkspace
      template={template}
      dateFrom={String(practice.date_from).slice(0, 10)}
      dateTo={String(practice.date_to).slice(0, 10)}
      practice={practice}
      editionId={practice.edition_id}
      editionType={edition?.edition_type ?? null}
      tripTitle={edition?.title ?? null}
      canRename={canRename}
      members={members}
      isMember
      canJoin={false}
      backHref="/pratiche"
      backLabel="I miei viaggi"
      initialTab={tab ?? step}
      initialStay={stay}
    />
  );
}
