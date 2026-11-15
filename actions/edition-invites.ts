'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getEdition } from '@/lib/data/editions';
import { createNotification } from '@/lib/data/notifications';
import { getSiteUrl } from '@/lib/brand';
import { isInviteEmailEnabled } from '@/lib/flags';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { DASHBOARD_VIAGGI_COPY } from '@/lib/itineraries/dashboard-viaggi-copy';

/**
 * Invite channel email (Kr #7). Default OFF — attende Legale.
 * Keep this action so UI can call it safely; always refuse while flag is off.
 */
export async function inviteEditionByEmailAction(_input: {
  editionId: string;
  email: string;
}): Promise<{ ok: true } | { error: string }> {
  if (!isInviteEmailEnabled()) {
    return { error: DASHBOARD_VIAGGI_COPY.invite.emailDisabled };
  }
  return { error: DASHBOARD_VIAGGI_COPY.invite.emailDisabled };
}

/**
 * Invite an existing Noivia user to a private edition (in-app notification + invite link).
 * Does not send email/WhatsApp; does not auto-join. No payments.
 * Email invite channel is gated by isInviteEmailEnabled() (default OFF — attende Legale).
 */
export async function inviteEditionFriendAction(input: {
  editionId: string;
  toUserId: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Accedi per invitare.' };
  const fromUserId = session.user.id;
  if (fromUserId === input.toUserId) {
    return { error: 'Non puoi invitare te stesso.' };
  }

  const edition = await getEdition(input.editionId);
  if (!edition) return { error: 'Viaggio non trovato.' };
  if (edition.created_by && edition.created_by !== fromUserId) {
    return { error: 'Solo il creatore può invitare.' };
  }
  if (!edition.invite_token) {
    return { error: 'Link invito non disponibile per questo viaggio.' };
  }

  const { data: target } = await supabaseAdmin
    .from('users')
    .select('id, first_name, username')
    .eq('id', input.toUserId)
    .maybeSingle();
  if (!target) return { error: 'Utente non trovato su Noivia.' };

  const inviteUrl = `${getSiteUrl()}/invito/${edition.invite_token}`;
  const fromName =
    session.user.name?.trim() ||
    session.user.email?.split('@')[0] ||
    'Un amico';

  await createNotification({
    userId: input.toUserId,
    type: 'trip_invite_received',
    title: `${fromName} ti invita in un viaggio`,
    body: 'Apri il link per entrare nel viaggio e nella chat. Nessun obbligo di prenotare.',
    link: inviteUrl,
    metadata: {
      editionId: edition.id,
      fromUserId,
      inviteToken: edition.invite_token,
    },
  });

  revalidatePath(`/pratica`);
  return { ok: true };
}

/** Search Noivia users by username / name (for invite picker). */
export async function searchNoiviaUsersAction(query: string): Promise<{
  users: Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    image: string | null;
  }>;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id) return { users: [], error: 'Non autenticato' };
  const q = query.trim();
  if (q.length < 2) return { users: [] };

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, username, image')
    .or(
      `username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    )
    .neq('id', session.user.id)
    .limit(12);

  if (error) return { users: [], error: error.message };
  return {
    users: (data ?? []).map((u) => ({
      userId: u.id as string,
      firstName: (u.first_name as string | null) ?? null,
      lastName: (u.last_name as string | null) ?? null,
      username: (u.username as string | null) ?? null,
      image: (u.image as string | null) ?? null,
    })),
  };
}
