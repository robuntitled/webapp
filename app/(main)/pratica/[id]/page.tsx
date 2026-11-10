import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TripWorkspace } from '@/components/itineraries/workspace/TripWorkspace';
import type { TripParticipant } from '@/components/itineraries/workspace/TripSelectedFlightsPanel';
import { getPractice } from '@/lib/data/practices';
import { getEdition, listEditionMembers } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { practiceDestinationLabel } from '@/lib/itineraries/free-trip';
import { hasFlightBooked } from '@/lib/itineraries/practice-lifecycle';
import { supabaseAdmin } from '@/lib/supabase-admin';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; step?: string; stay?: string }>;
};

export default async function PraticaPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const { tab, step, stay } = await searchParams;
  const practiceRow = await getPractice(id, session.user.id);
  if (!practiceRow) notFound();
  const practice = practiceRow;
  const template = findItineraryTemplate(practice.template_id) ?? null;
  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;
  const members = practice.edition_id
    ? await listEditionMembers(practice.edition_id, { withRatings: true })
    : [];

  const canRename = Boolean(
    practice.edition_id &&
      ((edition?.created_by != null && edition.created_by === session.user.id) ||
        (edition?.edition_type === 'private' && !edition.created_by) ||
        (!edition && practice.mode === 'friends'))
  );

  const memberPracticeFlags = new Map<string, boolean>();
  if (practice.edition_id) {
    const { data: peerPractices } = await supabaseAdmin
      .from('practices')
      .select('user_id, flight_confirmed_at, flight_booking, flight_bookings')
      .eq('edition_id', practice.edition_id);
    for (const row of peerPractices ?? []) {
      memberPracticeFlags.set(
        row.user_id as string,
        hasFlightBooked(row as Parameters<typeof hasFlightBooked>[0])
      );
    }
  }

  const ownerId = edition?.created_by ?? practice.user_id;
  const participants: TripParticipant[] = [];
  const seen = new Set<string>();

  const selfId = session.user.id;
  const practiceUserId = practice.user_id;

  function pushParticipant(userId: string, name: string, isOwner: boolean) {
    if (seen.has(userId)) return;
    seen.add(userId);
    participants.push({
      userId,
      name,
      isOwner,
      isSelf: userId === selfId,
      flightsBought:
        memberPracticeFlags.get(userId) ??
        (userId === practiceUserId ? hasFlightBooked(practice) : false),
    });
  }

  {
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, username')
      .eq('id', ownerId)
      .maybeSingle();
    const name =
      [owner?.first_name, owner?.last_name].filter(Boolean).join(' ').trim() ||
      owner?.username ||
      'Creatore';
    pushParticipant(ownerId, name, true);
  }

  for (const m of members) {
    const name =
      [m.firstName, m.lastName].filter(Boolean).join(' ').trim() ||
      m.username ||
      'Partecipante';
    pushParticipant(m.userId, name, m.userId === ownerId);
  }

  if (!seen.has(selfId)) {
    pushParticipant(selfId, session.user.name?.trim() || 'Tu', selfId === ownerId);
  }

  return (
    <TripWorkspace
      template={template}
      destinationName={practiceDestinationLabel({
        templateName: template?.destination_name,
        destinationLabel: practice.destination_label,
        destinationIata: practice.destination_iata,
        templateId: practice.template_id,
      })}
      destinationSlug={template?.destination_slug ?? practice.destination_iata ?? 'viaggio'}
      dateFrom={String(practice.date_from).slice(0, 10)}
      dateTo={String(practice.date_to).slice(0, 10)}
      practice={practice}
      editionId={practice.edition_id}
      editionType={edition?.edition_type ?? null}
      tripTitle={edition?.title ?? null}
      canRename={canRename}
      members={members}
      participants={participants}
      isMember
      canJoin={false}
      backHref="/pratiche"
      backLabel="I miei viaggi"
      initialTab={tab ?? step}
      initialStay={stay}
    />
  );
}
