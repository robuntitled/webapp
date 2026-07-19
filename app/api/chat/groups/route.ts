import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { ChatGroupItem } from '@/lib/chat/types';
import { fetchCreatedTrips, fetchJoinedTrips } from '@/lib/data/trips';
import { getParticipantCount } from '@/lib/trips/display';
import { isTripEnded } from '@/lib/utils/trip';

export const dynamic = 'force-dynamic';

/** Gruppi chat: viaggi in cui sei membro e c’è almeno un altro utente. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const userId = session.user.id;
  const [created, joined] = await Promise.all([
    fetchCreatedTrips(userId),
    fetchJoinedTrips(userId),
  ]);

  const groups: ChatGroupItem[] = [...created, ...joined]
    .filter((trip) => !isTripEnded(trip.endDate))
    .map((trip) => {
      const participantCount =
        trip.participantCount ?? getParticipantCount(trip.trip_participants);
      return {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        imageUrl: trip.imageUrl,
        participantCount,
        role: (trip.creator?.id === userId || trip.creator_id === userId
          ? 'owner'
          : 'member') as ChatGroupItem['role'],
      };
    })
    .filter((g) => g.participantCount >= 2)
    .sort((a, b) => a.title.localeCompare(b.title, 'it'));

  return NextResponse.json({ groups });
}
