'use server';

import { auth } from '@/auth';
import {
  PHONE_VERIFY_REQUIRED_CODE,
  requirePhoneVerified,
  isPhoneVerifyRequiredError,
} from '@/lib/auth/require-phone-verified';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export type JoinTripResult =
  | { ok: true; alreadyJoined?: boolean }
  | { ok: false; error: string; code?: string };

export async function deleteTrip(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  const userId = session.user.id;

  const { error } = await supabaseAdmin
    .from('trips')
    .delete()
    .match({ id: tripId, creator_id: userId });

  if (error) {
    console.error('Errore eliminazione viaggio:', error);
    throw new Error('Impossibile eliminare il viaggio.');
  }

  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/scopri');
}

/** Join idempotente: non lancia errori (evita crash RSC in produzione). */
export async function joinTrip(tripId: string): Promise<JoinTripResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Devi essere loggato per unirti a un viaggio.' };
  }
  const userId = session.user.id;

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
    .select('creator_id, max_participants')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return { ok: false, error: 'Viaggio non trovato.' };
  }
  if (trip.creator_id === userId) {
    return { ok: false, error: 'Non puoi unirti a un viaggio che hai creato tu.' };
  }

  const { data: existing } = await supabaseAdmin
    .from('trip_participants')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    revalidatePath('/dashboard/miei-viaggi');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/scopri');
    revalidatePath(`/viaggi/${tripId}`);
    return { ok: true, alreadyJoined: true };
  }

  const { count: participantsCount, error: countError } = await supabaseAdmin
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  if (countError) {
    return { ok: false, error: 'Impossibile verificare i posti disponibili.' };
  }
  if (participantsCount === null || participantsCount >= trip.max_participants) {
    return { ok: false, error: 'Questo viaggio è al completo!' };
  }

  const { error: insertError } = await supabaseAdmin
    .from('trip_participants')
    .insert({ user_id: userId, trip_id: tripId, role: 'viewer' });

  if (insertError) {
    if (insertError.code === '23505') {
      revalidatePath('/dashboard/miei-viaggi');
      revalidatePath('/dashboard');
      revalidatePath('/dashboard/scopri');
      revalidatePath(`/viaggi/${tripId}`);
      return { ok: true, alreadyJoined: true };
    }
    console.error('ERRORE JOIN TRIP:', insertError);
    return { ok: false, error: 'Impossibile unirsi al viaggio in questo momento.' };
  }

  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/scopri');
  revalidatePath(`/viaggi/${tripId}`);
  return { ok: true };
}
