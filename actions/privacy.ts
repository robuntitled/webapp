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

export async function exportUserData() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  const userId = session.user.id;

  const [userResult, favoritesResult, createdResult, joinedResult] = await Promise.all([
    supabaseAdmin.from('users').select('*').eq('id', userId).single(),
    supabaseAdmin.from('favorite_trips').select('trip_id').eq('user_id', userId),
    supabaseAdmin.from('trips').select('*').eq('creator_id', userId),
    supabaseAdmin.from('trip_participants').select('trip_id').eq('user_id', userId),
  ]);

  if (userResult.error || !userResult.data) {
    throw new Error('Impossibile recuperare i dati personali.');
  }

  const { hashedPassword: _removed, ...safeUser } = userResult.data;

  return {
    exportedAt: new Date().toISOString(),
    format: 'GDPR Art. 20 — Portabilità dati',
    personalData: safeUser,
    favoriteTrips: favoritesResult.data ?? [],
    createdTrips: createdResult.data ?? [],
    joinedTrips: joinedResult.data ?? [],
  };
}

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

  if (tripIds.length > 0) {
    await supabaseAdmin.from('favorite_trips').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trip_participants').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trips').delete().eq('creator_id', userId);
  }

  await supabaseAdmin.from('favorite_trips').delete().eq('user_id', userId);
  await supabaseAdmin.from('trip_participants').delete().eq('user_id', userId);

  const { data: storageFiles } = await supabaseAdmin.storage.from('avatars').list(userId);
  if (storageFiles?.length) {
    const paths = storageFiles.map((f) => `${userId}/${f.name}`);
    await supabaseAdmin.storage.from('avatars').remove(paths);
  }

  const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);
  if (error) {
    console.error('Errore eliminazione account:', error);
    throw new Error("Impossibile eliminare l'account.");
  }

  return { success: true };
}