import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PartenzeJoinFlow } from '@/components/itineraries/PartenzeJoinFlow';
import { joinEdition, listEditionMembers } from '@/lib/data/editions';
import { listEditionPeerFlights } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PartenzeJoinPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  if (id.startsWith('seed-')) {
    redirect('/partenze');
  }

  const joined = await joinEdition({ userId: session.user.id, editionId: id });
  if ('error' in joined) {
    redirect('/partenze');
  }

  const template = findItineraryTemplate(joined.practice.template_id);
  if (!template) notFound();

  const [members, peerFlights] = await Promise.all([
    listEditionMembers(id),
    listEditionPeerFlights(id, session.user.id),
  ]);

  return (
    <PartenzeJoinFlow
      practiceId={joined.practice.id}
      template={template}
      dateFrom={String(joined.practice.date_from).slice(0, 10)}
      dateTo={String(joined.practice.date_to).slice(0, 10)}
      members={members}
      peerFlights={peerFlights}
    />
  );
}
