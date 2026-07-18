'use server';

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  buildMarketingConsentFields,
  buildPrivacyConsentFields,
} from '@/lib/privacy/consent';
import { revalidatePath } from 'next/cache';

export async function acceptLegalConsent(marketingConsent: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      ...buildPrivacyConsentFields(true),
      ...buildMarketingConsentFields(marketingConsent),
    })
    .eq('id', session.user.id);

  if (error) {
    console.error('Errore accettazione consensi:', error);
    throw new Error('Impossibile registrare i consensi.');
  }

  revalidatePath('/completa-registrazione');
  return { success: true, privacyConsentAccepted: true };
}

/**
 * GDPR Art. 20 — export portabile di tutti i dati personali noti in app.
 * Esclude secret (hashedPassword).
 */
export async function exportUserData() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  const userId = session.user.id;

  const [
    userResult,
    favoritesResult,
    createdResult,
    joinedResult,
    plannerResult,
    draftsResult,
    watchesResult,
    messagesResult,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*').eq('id', userId).single(),
    supabaseAdmin.from('favorite_trips').select('trip_id').eq('user_id', userId),
    supabaseAdmin.from('trips').select('*').eq('creator_id', userId),
    supabaseAdmin
      .from('trip_participants')
      .select('trip_id, role, joined_at')
      .eq('user_id', userId),
    supabaseAdmin.from('planner_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('composer_drafts').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('price_watches').select('*').eq('created_by', userId),
    supabaseAdmin
      .from('trip_messages')
      .select('id, trip_id, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  if (userResult.error || !userResult.data) {
    throw new Error('Impossibile recuperare i dati personali.');
  }

  const { hashedPassword: _removed, ...safeUser } = userResult.data as Record<
    string,
    unknown
  > & { hashedPassword?: string };

  // Itinerario composer dei viaggi creati (giorni + blocchi)
  const createdTripIds = (createdResult.data ?? []).map((t: { id: string }) => t.id);
  let tripDays: unknown[] = [];
  let tripBlocks: unknown[] = [];

  if (createdTripIds.length > 0) {
    const { data: days } = await supabaseAdmin
      .from('trip_days')
      .select('*')
      .in('trip_id', createdTripIds)
      .order('day_index', { ascending: true });
    tripDays = days ?? [];

    const dayIds = (days ?? []).map((d: { id: string }) => d.id);
    if (dayIds.length > 0) {
      const { data: blocks } = await supabaseAdmin
        .from('trip_blocks')
        .select('*')
        .in('trip_day_id', dayIds)
        .order('sort_order', { ascending: true });
      tripBlocks = blocks ?? [];
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    format: 'GDPR Art. 20 — Portabilità dati',
    personalData: safeUser,
    plannerProfile: plannerResult.data ?? null,
    composerDraft: draftsResult.data ?? null,
    favoriteTrips: favoritesResult.data ?? [],
    createdTrips: createdResult.data ?? [],
    createdTripDays: tripDays,
    createdTripBlocks: tripBlocks,
    joinedTrips: joinedResult.data ?? [],
    priceWatches: watchesResult.data ?? [],
    tripMessagesAuthored: messagesResult.data ?? [],
  };
}

/**
 * Cancellazione account (GDPR Art. 17).
 * Ordine esplicito + dipendenze, anche se molte tabelle hanno ON DELETE CASCADE.
 */
export async function deleteUserAccount(confirmation: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  if (confirmation !== 'ELIMINA') {
    throw new Error('Conferma non valida. Digita ELIMINA per procedere.');
  }

  const userId = session.user.id;

  const { data: createdTrips } = await supabaseAdmin
    .from('trips')
    .select('id')
    .eq('creator_id', userId);

  const tripIds = createdTrips?.map((t) => t.id) ?? [];

  // 1) Dati legati all’utente (bozze, profilo planner, messaggi, watch)
  await supabaseAdmin.from('composer_drafts').delete().eq('user_id', userId);
  await supabaseAdmin.from('planner_profiles').delete().eq('user_id', userId);
  await supabaseAdmin.from('trip_messages').delete().eq('user_id', userId);
  await supabaseAdmin.from('price_watches').delete().eq('created_by', userId);
  await supabaseAdmin.from('favorite_trips').delete().eq('user_id', userId);
  await supabaseAdmin.from('trip_participants').delete().eq('user_id', userId);

  // 2) Viaggi creati: dipendenti + trip (cascade days/blocks/messages/watches residue)
  if (tripIds.length > 0) {
    await supabaseAdmin.from('price_watches').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trip_messages').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('favorite_trips').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trip_participants').delete().in('trip_id', tripIds);
    // trip_blocks → trip_days → trips (CASCADE su days/blocks)
    await supabaseAdmin.from('trips').delete().eq('creator_id', userId);
  }

  // 3) Storage avatar
  const { data: storageFiles } = await supabaseAdmin.storage.from('avatars').list(userId);
  if (storageFiles?.length) {
    const paths = storageFiles.map((f) => `${userId}/${f.name}`);
    await supabaseAdmin.storage.from('avatars').remove(paths);
  }

  // 4) Utente (cascade residui su tabelle con FK users)
  const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);
  if (error) {
    console.error('Errore eliminazione account:', error);
    throw new Error("Impossibile eliminare l'account.");
  }

  return { success: true };
}
