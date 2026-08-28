import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PartenzeJoinFlow } from '@/components/itineraries/PartenzeJoinFlow';
import { CuratedEditionBadge } from '@/components/itineraries/EditionTrust';
import { ShareTripLink } from '@/components/itineraries/ShareTripLink';
import { getEdition, joinEdition, listEditionMembers } from '@/lib/data/editions';
import { listEditionPeerFlights } from '@/lib/data/practices';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { editionJoinReason } from '@/lib/itineraries/edition-present';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PartenzeJoinPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  if (id.startsWith('seed-')) {
    redirect('/destinazioni?vista=partenze');
  }

  const edition = await getEdition(id);
  if (!edition) redirect('/destinazioni?vista=partenze');

  const joined = await joinEdition({ userId: session.user.id, editionId: id });
  if ('error' in joined) {
    redirect('/destinazioni?vista=partenze');
  }

  const template = findItineraryTemplate(joined.practice.template_id);
  if (!template) notFound();

  const [members, peerFlights] = await Promise.all([
    listEditionMembers(id, { withRatings: true }),
    listEditionPeerFlights(id, session.user.id),
  ]);

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nomadlink.it'}/partenze/${id}`;
  const joinReason = editionJoinReason({
    confirmed_count: edition.confirmed_count ?? 0,
    min_confirmed: edition.min_confirmed,
    interested_count: edition.interested_count ?? 0,
  });

  return (
    <div className="space-y-6">
      <CuratedEditionBadge />
      <p className="text-sm text-muted-foreground">{joinReason}</p>
      <ShareTripLink
        url={shareUrl}
        title={`Partenza ${template.destination_name}`}
        message={`Unisciti a questa partenza su Bradigo — ${template.destination_name}`}
      />
      <PartenzeJoinFlow
        practiceId={joined.practice.id}
        template={template}
        dateFrom={String(joined.practice.date_from).slice(0, 10)}
        dateTo={String(joined.practice.date_to).slice(0, 10)}
        members={members}
        peerFlights={peerFlights}
        editionStats={{
          confirmed: edition.confirmed_count ?? 0,
          interested: edition.interested_count ?? 0,
          minConfirmed: edition.min_confirmed,
        }}
      />
    </div>
  );
}
