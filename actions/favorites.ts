'use server';

import { auth } from '../auth';
// Usiamo il client Admin, che ha i permessi per scrivere sul database dal server
import { supabaseAdmin } from '../lib/supabase-admin';
import { revalidatePath } from 'next/cache';

// La nostra action intelligente che non si fida più del client
export async function toggleFavorite(tripId: string) {
  // La nostra sicurezza è qui: controlliamo la sessione di NextAuth
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  const userId = session.user.id;

  // Usiamo il client Admin per tutte le operazioni sul DB
  const supabase = supabaseAdmin;

  // 1. Controlliamo se il preferito esiste GIÀ nel database
  const { data: existingFavorite } = await supabase
    .from('favorite_trips')
    .select('id')
    .match({ user_id: userId, trip_id: tripId })
    .single();

  // 2. Decidiamo se cancellare o inserire
  if (existingFavorite) {
    // Se esiste, lo cancelliamo
    const { error } = await supabase.from('favorite_trips').delete().match({ id: existingFavorite.id });
    if (error) {
      console.error("ERRORE SUPABASE (DELETE):", error);
      throw new Error("Impossibile rimuovere il preferito.");
    }
  } else {
    // Se non esiste, lo inseriamo
    const { error } = await supabase.from('favorite_trips').insert({ user_id: userId, trip_id: tripId });
    if (error) {
      console.error("ERRORE VERO DA SUPABASE (INSERT):", error);
      throw new Error("Impossibile aggiungere il preferito.");
    }
  }
  
  // Aggiorniamo la cache delle pagine interessate
  revalidatePath('/dashboard');
}