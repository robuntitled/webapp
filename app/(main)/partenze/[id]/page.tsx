import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TripWorkspace } from '@/components/itineraries/workspace/TripWorkspace';
import { getEdition, listEditionMembers } from '@/lib/data/editions';
import { findPracticeForEdition } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; stay?: string }>;
};

export default async function PartenzeJoinPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { id } = await params;
  const { tab, stay } = await searchParams;
  if (id.startsWith('seed-')) {
    redirect('/partenze');
  }

  const edition = await getEdition(id);
  if (!edition) redirect('/partenze');
  if (edition.status === 'closed' || edition.status === 'locked') {
    redirect('/partenze');
  }

  const template = findItineraryTemplate(edition.template_id);
  if (!template) notFound();

  if (session?.user?.id) {
    const existing = await findPracticeForEdition(session.user.id, id);
    if (existing) {
      const qs = new URLSearchParams();
      if (tab) qs.set('tab', tab);
      if (stay) qs.set('stay', stay);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      redirect(`/pratica/${existing.id}${suffix}`);
    }
  }

  const members = await listEditionMembers(id, { withRatings: true });
  const dateFrom = String(edition.date_from).slice(0, 10);
  const dateTo = String(edition.date_to).slice(0, 10);

  return (
    <TripWorkspace
      template={template}
      dateFrom={dateFrom}
      dateTo={dateTo}
      editionId={edition.id}
      editionType={edition.edition_type}
      members={members}
      isMember={false}
      canJoin
      backHref="/partenze"
      backLabel="Torna a Unisciti"
      initialTab={tab}
      initialStay={stay}
    />
  );
}
