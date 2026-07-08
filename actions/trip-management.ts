'use server';

import { auth } from '../auth';
import { supabaseAdmin } from '../lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function deleteTrip(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  const userId = session.user.id;

  const supabase = supabaseAdmin;
  const { error } = await supabase
    .from('trips')
    .delete()
    .match({ id: tripId, creator_id: userId });

  if (error) {
    console.error("Errore eliminazione viaggio:", error);
    throw new Error("Impossibile eliminare il viaggio.");
  }

  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath('/dashboard');
}


// --- FUNZIONE AGGIUNTA ---
export async function joinTrip(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Devi essere loggato per unirti a un viaggio.');
  }
  const userId = session.user.id;

  const supabase = supabaseAdmin;

  // Prima, controlliamo che l'utente non sia il creatore del viaggio
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('creator_id, max_participants')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw new Error("Viaggio non trovato.");
  }
  if (trip.creator_id === userId) {
    throw new Error("Non puoi unirti a un viaggio che hai creato tu.");
  }
  
  // Poi, controlliamo che il viaggio non sia pieno
  const { count: participantsCount, error: countError } = await supabase
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId);
    
  if (countError) {
    throw new Error("Impossibile verificare i posti disponibili.");
  }
  if (participantsCount === null || participantsCount >= trip.max_participants) {
    throw new Error("Questo viaggio è al completo!");
  }

  // Se tutti i controlli passano, inseriamo l'utente nella tabella dei partecipanti
  const { error: insertError } = await supabase
    .from('trip_participants')
    .insert({ user_id: userId, trip_id: tripId });

  if (insertError) {
    if (insertError.code === '23505') { // Codice errore per violazione di vincolo UNIQUE
        throw new Error("Sei già iscritto a questo viaggio.");
    }
    console.error("ERRORE JOIN TRIP:", insertError);
    throw new Error("Impossibile unirsi al viaggio in questo momento.");
  }

  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath('/dashboard');
}