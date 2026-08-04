'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  PHONE_VERIFY_REQUIRED_CODE,
  requirePhoneVerified,
  isPhoneVerifyRequiredError,
} from '@/lib/auth/require-phone-verified';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  notifyJoinRequestCreated,
  notifyJoinRequestResolved,
} from '@/lib/notifications/trip-join';

export type JoinRequestResult =
  | { ok: true; status: 'pending' | 'already_pending' | 'already_member' }
  | { ok: false; error: string; code?: string };

export type RespondJoinRequestResult =
  | { ok: true; accepted: boolean }
  | { ok: false; error: string };

function revalidateTrip(tripId: string) {
  revalidatePath(`/viaggi/${tripId}`);
  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath('/dashboard');
}

/** Solo il creatore o chi ha ruolo owner/editor può gestire le richieste. */
async function assertCanManage(tripId: string, userId: string): Promise<boolean> {
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

/** L'utente chiede di unirsi: crea una richiesta in attesa di approvazione. */
export async function requestToJoinTrip(
  tripId: string,
  message?: string
): Promise<JoinRequestResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Devi essere loggato per unirti a un viaggio.' };
  }
  const userId = session.user.id;

  const parsedTripId = z.string().uuid().safeParse(tripId);
  if (!parsedTripId.success) return { ok: false, error: 'Viaggio non valido.' };

  try {
    await requirePhoneVerified(userId);
  } catch (error) {
    if (isPhoneVerifyRequiredError(error)) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Verifica telefono richiesta',
        code: PHONE_VERIFY_REQUIRED_CODE,
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Impossibile verificare il telefono.',
    };
  }

  const { data: trip, error: tripError } = await supabaseAdmin
    .from('trips')
    .select('id, creator_id, max_participants')
    .eq('id', parsedTripId.data)
    .single();

  if (tripError || !trip) return { ok: false, error: 'Viaggio non trovato.' };
  if (trip.creator_id === userId) {
    return { ok: false, error: 'Non puoi unirti a un viaggio che hai creato tu.' };
  }

  const { data: existing } = await supabaseAdmin
    .from('trip_participants')
    .select('user_id')
    .eq('trip_id', parsedTripId.data)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    revalidateTrip(parsedTripId.data);
    return { ok: true, status: 'already_member' };
  }

  const { count: participantsCount, error: countError } = await supabaseAdmin
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', parsedTripId.data);

  if (countError) {
    return { ok: false, error: 'Impossibile verificare i posti disponibili.' };
  }
  if (participantsCount === null || participantsCount >= trip.max_participants) {
    return { ok: false, error: 'Questo viaggio è al completo!' };
  }

  const { data: previous } = await supabaseAdmin
    .from('trip_join_requests')
    .select('id, status')
    .eq('trip_id', parsedTripId.data)
    .eq('user_id', userId)
    .maybeSingle();

  if (previous?.status === 'pending') {
    return { ok: true, status: 'already_pending' };
  }
  if (previous?.status === 'rejected') {
    return {
      ok: false,
      error: 'L’organizzatore ha già rifiutato la tua richiesta per questo viaggio.',
    };
  }

  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from('trip_join_requests')
    .upsert(
      {
        trip_id: parsedTripId.data,
        user_id: userId,
        message: message?.trim() ? message.trim().slice(0, 300) : null,
        status: 'pending',
        responded_at: null,
        responded_by: null,
      },
      { onConflict: 'trip_id,user_id' }
    )
    .select('id')
    .maybeSingle();

  if (upsertError) {
    console.error('[requestToJoinTrip]', upsertError.message);
    return { ok: false, error: 'Impossibile inviare la richiesta in questo momento.' };
  }

  if (upserted?.id) {
    void notifyJoinRequestCreated({
      tripId: parsedTripId.data,
      requestId: upserted.id as string,
      requesterId: userId,
    });
  }

  revalidateTrip(parsedTripId.data);
  return { ok: true, status: 'pending' };
}

/** L'organizzatore accetta o rifiuta una richiesta. */
export async function respondJoinRequest(input: {
  requestId: string;
  accept: boolean;
}): Promise<RespondJoinRequestResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per rispondere.' };

  const requestId = z.string().uuid().safeParse(input.requestId);
  if (!requestId.success) return { ok: false, error: 'Richiesta non valida.' };

  const { data: request, error: fetchErr } = await supabaseAdmin
    .from('trip_join_requests')
    .select('id, trip_id, user_id, status')
    .eq('id', requestId.data)
    .maybeSingle();

  if (fetchErr || !request) return { ok: false, error: 'Richiesta non trovata.' };
  if (request.status !== 'pending') return { ok: false, error: 'Richiesta già gestita.' };

  const canManage = await assertCanManage(request.trip_id as string, userId);
  if (!canManage) {
    return { ok: false, error: 'Solo l’organizzatore può gestire le richieste.' };
  }

  if (input.accept) {
    const { data: trip } = await supabaseAdmin
      .from('trips')
      .select('max_participants')
      .eq('id', request.trip_id)
      .maybeSingle();

    const { data: existing } = await supabaseAdmin
      .from('trip_participants')
      .select('user_id')
      .eq('trip_id', request.trip_id)
      .eq('user_id', request.user_id)
      .maybeSingle();

    if (!existing) {
      const { count } = await supabaseAdmin
        .from('trip_participants')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', request.trip_id);

      if (
        trip?.max_participants != null &&
        count != null &&
        count >= trip.max_participants
      ) {
        return { ok: false, error: 'Il viaggio è al completo: libera un posto prima.' };
      }

      const { error: joinErr } = await supabaseAdmin.from('trip_participants').insert({
        trip_id: request.trip_id,
        user_id: request.user_id,
        role: 'viewer',
      });

      if (joinErr && joinErr.code !== '23505') {
        console.error('[respondJoinRequest join]', joinErr.message);
        return { ok: false, error: 'Impossibile aggiungere la persona alla crew.' };
      }
    }
  }

  const { error: updErr } = await supabaseAdmin
    .from('trip_join_requests')
    .update({
      status: input.accept ? 'accepted' : 'rejected',
      responded_at: new Date().toISOString(),
      responded_by: userId,
    })
    .eq('id', request.id)
    .eq('status', 'pending');

  if (updErr) {
    console.error('[respondJoinRequest]', updErr.message);
    return { ok: false, error: 'Impossibile aggiornare la richiesta.' };
  }

  void notifyJoinRequestResolved({
    tripId: request.trip_id as string,
    requestId: request.id as string,
    requesterId: request.user_id as string,
    accepted: input.accept,
  });

  revalidateTrip(request.trip_id as string);
  return { ok: true, accepted: input.accept };
}

/** Il richiedente ritira la propria richiesta. */
export async function cancelJoinRequest(tripId: string): Promise<RespondJoinRequestResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per continuare.' };

  const parsedTripId = z.string().uuid().safeParse(tripId);
  if (!parsedTripId.success) return { ok: false, error: 'Viaggio non valido.' };

  const { error } = await supabaseAdmin
    .from('trip_join_requests')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('trip_id', parsedTripId.data)
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (error) {
    console.error('[cancelJoinRequest]', error.message);
    return { ok: false, error: 'Impossibile annullare la richiesta.' };
  }

  revalidateTrip(parsedTripId.data);
  return { ok: true, accepted: false };
}
