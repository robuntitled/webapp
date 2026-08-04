import 'server-only';

import { createNotification } from '@/lib/data/notifications';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import { sendTransactionalEmail } from '@/lib/email/send';
import { supabaseAdmin } from '@/lib/supabase-admin';

function displayName(user: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
} | null): string {
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (user?.username) return `@${user.username}`;
  return 'Un viaggiatore';
}

async function loadUser(userId: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, email, email_verified_at, first_name, last_name, username')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

async function loadTrip(tripId: string) {
  const { data } = await supabaseAdmin
    .from('trips')
    .select('id, title, creator_id')
    .eq('id', tripId)
    .maybeSingle();
  return data;
}

async function emailIfPossible(input: {
  userId: string;
  subject: string;
  html: string;
  text: string;
}) {
  const user = await loadUser(input.userId);
  const email = user?.email?.trim();
  if (!email || !user?.email_verified_at) return;
  void sendTransactionalEmail({
    to: email,
    subject: input.subject,
    html: input.html,
    text: input.text,
  }).catch((e) => console.error('[notify email]', e));
}

/** Notifica l'organizzatore di una nuova richiesta di partecipazione. */
export async function notifyJoinRequestCreated(input: {
  tripId: string;
  requestId: string;
  requesterId: string;
}): Promise<void> {
  try {
    const [trip, requester] = await Promise.all([
      loadTrip(input.tripId),
      loadUser(input.requesterId),
    ]);
    if (!trip?.creator_id) return;

    const name = displayName(requester);
    const tripTitle = String(trip.title ?? 'Viaggio');
    const link = `/viaggi/${trip.id}`;
    const title = 'Nuova richiesta di partecipazione';
    const body = `${name} vuole unirsi a «${tripTitle}»`;

    await createNotification({
      userId: trip.creator_id as string,
      type: 'trip_join_request',
      title,
      body,
      link,
      metadata: {
        tripId: trip.id,
        requestId: input.requestId,
        fromUserId: input.requesterId,
      },
    });

    const url = `${getAppBaseUrl()}${link}`;
    await emailIfPossible({
      userId: trip.creator_id as string,
      subject: `Nuova richiesta per «${tripTitle}» — NomadLink`,
      text: `${body}\n\nGestisci la richiesta: ${url}`,
      html: `<p><strong>${name}</strong> vuole unirsi a <strong>${tripTitle}</strong>.</p><p><a href="${url}">Apri il viaggio e rispondi</a></p>`,
    });
  } catch (e) {
    console.error('[notifyJoinRequestCreated]', e);
  }
}

/** Notifica il richiedente dopo accettazione o rifiuto. */
export async function notifyJoinRequestResolved(input: {
  tripId: string;
  requestId: string;
  requesterId: string;
  accepted: boolean;
}): Promise<void> {
  try {
    const trip = await loadTrip(input.tripId);
    if (!trip) return;

    const tripTitle = String(trip.title ?? 'Viaggio');
    const link = `/viaggi/${trip.id}`;
    const accepted = input.accepted;
    const title = accepted ? 'Richiesta accettata' : 'Richiesta rifiutata';
    const body = accepted
      ? `Sei nella crew di «${tripTitle}»`
      : `L’organizzatore ha rifiutato la tua richiesta per «${tripTitle}»`;

    await createNotification({
      userId: input.requesterId,
      type: accepted ? 'trip_join_accepted' : 'trip_join_rejected',
      title,
      body,
      link,
      metadata: {
        tripId: trip.id,
        requestId: input.requestId,
        accepted,
      },
    });

    const url = `${getAppBaseUrl()}${link}`;
    await emailIfPossible({
      userId: input.requesterId,
      subject: `${title}: «${tripTitle}» — NomadLink`,
      text: `${body}\n\n${url}`,
      html: `<p>${body}.</p><p><a href="${url}">Vai al viaggio</a></p>`,
    });
  } catch (e) {
    console.error('[notifyJoinRequestResolved]', e);
  }
}
