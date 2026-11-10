import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  ProssimoPasso,
  type ParticipantStatusCard,
} from '@/components/itineraries/ProssimoPasso';
import { getPractice } from '@/lib/data/practices';
import { getEdition, listEditionMembers } from '@/lib/data/editions';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { getSiteUrl } from '@/lib/brand';
import { parseSelectedFlightPlan } from '@/lib/itineraries/selected-flight-plan';
import { hasFlightBooked } from '@/lib/itineraries/practice-lifecycle';
import { supabaseAdmin } from '@/lib/supabase-admin';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProssimoPassoPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  const { id } = await params;
  const practiceRow = await getPractice(id, session.user.id);
  if (!practiceRow) notFound();
  const practice = practiceRow;
  const template = findItineraryTemplate(practice.template_id);
  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;

  const inviteToken = edition?.invite_token ?? null;
  const inviteUrl = inviteToken ? `${getSiteUrl()}/invito/${inviteToken}` : null;
  const { practiceDestinationLabel } = await import('@/lib/itineraries/free-trip');

  const selectedFlightPlan = parseSelectedFlightPlan(
    (practice as { selected_flight_plan?: unknown }).selected_flight_plan
  );

  const members = practice.edition_id
    ? await listEditionMembers(practice.edition_id)
    : [];

  // Real flight/hotel flags per member practice when available.
  const memberPracticeFlags = new Map<
    string,
    { flightsBought: boolean; hotelBooked: boolean }
  >();
  if (practice.edition_id) {
    const { data: peerPractices } = await supabaseAdmin
      .from('practices')
      .select(
        'user_id, flight_confirmed_at, hotel_confirmed_at, flight_booking, flight_bookings'
      )
      .eq('edition_id', practice.edition_id);
    for (const row of peerPractices ?? []) {
      const uid = row.user_id as string;
      memberPracticeFlags.set(uid, {
        flightsBought: hasFlightBooked(row as Parameters<typeof hasFlightBooked>[0]),
        hotelBooked: Boolean(row.hotel_confirmed_at),
      });
    }
  }

  const participants: ParticipantStatusCard[] = [];
  const ownerId = edition?.created_by ?? practice.user_id;
  const seen = new Set<string>();

  function pushParticipant(
    userId: string,
    name: string,
    status: ParticipantStatusCard['status']
  ) {
    if (seen.has(userId)) return;
    seen.add(userId);
    const flags = memberPracticeFlags.get(userId);
    participants.push({
      userId,
      name,
      status: userId === ownerId ? 'owner' : status,
      flightsBought:
        flags?.flightsBought ??
        (userId === practice.user_id ? hasFlightBooked(practice) : false),
      hotelBooked:
        flags?.hotelBooked ??
        (userId === practice.user_id ? Boolean(practice.hotel_confirmed_at) : false),
    });
  }

  // Owner first
  {
    const { data: owner } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, username')
      .eq('id', ownerId)
      .maybeSingle();
    const name =
      [owner?.first_name, owner?.last_name].filter(Boolean).join(' ') ||
      owner?.username ||
      'Tu';
    pushParticipant(ownerId, name, 'owner');
  }

  for (const m of members) {
    if (m.userId === ownerId) continue;
    const name =
      [m.firstName, m.lastName].filter(Boolean).join(' ') ||
      m.username ||
      'Partecipante';
    pushParticipant(m.userId, name, 'joined');
  }

  const showInviteStep = practice.mode === 'friends';

  return (
    <ProssimoPasso
      practiceId={practice.id}
      editionId={practice.edition_id}
      destinationName={practiceDestinationLabel({
        templateName: template?.destination_name,
        destinationLabel: practice.destination_label,
        destinationIata: practice.destination_iata,
        templateId: practice.template_id,
      })}
      tripTitle={edition?.title ?? null}
      dateFrom={String(practice.date_from).slice(0, 10)}
      dateTo={String(practice.date_to).slice(0, 10)}
      mode={practice.mode}
      editionType={edition?.edition_type ?? null}
      inviteUrl={inviteUrl}
      isPrivate={edition?.edition_type === 'private' || practice.mode !== 'group'}
      showInviteStep={showInviteStep}
      selectedFlightPlan={selectedFlightPlan}
      participants={participants}
    />
  );
}
