'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requirePhoneVerified } from '@/lib/auth/require-phone-verified';

export type TripInviteResult =
  | { ok: true }
  | { ok: false; error: string };

async function assertCanInvite(tripId: string, userId: string): Promise<boolean> {
  const { data: trip } = await supabaseAdmin
    .from('trips')
    .select('creator_id')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip) return false;
  if (trip.creator_id === userId) return true;

  const { data: part } = await supabaseAdmin
    .from('trip_participants')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  return part?.role === 'owner' || part?.role === 'editor';
}

export async function sendTripInvite(input: {
  tripId: string;
  toUserId: string;
}): Promise<TripInviteResult> {
  const session = await auth();
  const fromUserId = session?.user?.id;
  if (!fromUserId) return { ok: false, error: 'Accedi per invitare.' };

  const tripId = z.string().uuid().safeParse(input.tripId);
  const toUserId = z.string().uuid().safeParse(input.toUserId);
  if (!tripId.success || !toUserId.success) {
    return { ok: false, error: 'Dati non validi.' };
  }
  if (toUserId.data === fromUserId) {
    return { ok: false, error: 'Non puoi invitare te stesso.' };
  }

  const can = await assertCanInvite(tripId.data, fromUserId);
  if (!can) return { ok: false, error: 'Non puoi invitare su questo viaggio.' };

  const { data: already } = await supabaseAdmin
    .from('trip_participants')
    .select('user_id')
    .eq('trip_id', tripId.data)
    .eq('user_id', toUserId.data)
    .maybeSingle();
  if (already) return { ok: false, error: 'Questa persona è già nella crew.' };

  const { error } = await supabaseAdmin.from('trip_invites').upsert(
    {
      trip_id: tripId.data,
      from_user_id: fromUserId,
      to_user_id: toUserId.data,
      status: 'pending',
      responded_at: null,
    },
    { onConflict: 'trip_id,to_user_id' }
  );

  if (error) {
    console.error('[sendTripInvite]', error.message);
    return { ok: false, error: 'Impossibile inviare l’invito.' };
  }

  revalidatePath(`/viaggi/${tripId.data}`);
  revalidatePath('/dashboard/miei-viaggi');
  return { ok: true };
}

export async function respondTripInvite(input: {
  inviteId: string;
  accept: boolean;
}): Promise<TripInviteResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per rispondere.' };

  const inviteId = z.string().uuid().safeParse(input.inviteId);
  if (!inviteId.success) return { ok: false, error: 'Invito non valido.' };

  const { data: invite, error: fetchErr } = await supabaseAdmin
    .from('trip_invites')
    .select('id, trip_id, to_user_id, status')
    .eq('id', inviteId.data)
    .maybeSingle();

  if (fetchErr || !invite) {
    return { ok: false, error: 'Invito non trovato.' };
  }
  if (invite.to_user_id !== userId) {
    return { ok: false, error: 'Questo invito non è per te.' };
  }
  if (invite.status !== 'pending') {
    return { ok: false, error: 'Invito già gestito.' };
  }

  if (input.accept) {
    try {
      await requirePhoneVerified(userId);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Verifica il telefono per unirti.',
      };
    }

    const { data: existing } = await supabaseAdmin
      .from('trip_participants')
      .select('user_id')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      const { error: joinErr } = await supabaseAdmin.from('trip_participants').insert({
        trip_id: invite.trip_id,
        user_id: userId,
        role: 'viewer',
      });
      if (joinErr) {
        console.error('[respondTripInvite join]', joinErr.message);
        return { ok: false, error: 'Impossibile unirti al viaggio.' };
      }
    }
  }

  const { error: updErr } = await supabaseAdmin
    .from('trip_invites')
    .update({
      status: input.accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (updErr) {
    console.error('[respondTripInvite]', updErr.message);
    return { ok: false, error: 'Impossibile aggiornare l’invito.' };
  }

  revalidatePath(`/viaggi/${invite.trip_id}`);
  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath('/dashboard');
  return { ok: true };
}
