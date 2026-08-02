'use server';

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function toggleFavorite(tripId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  const userId = session.user.id;

  const { data: existingFavorite } = await supabaseAdmin
    .from('favorite_trips')
    .select('id')
    .match({ user_id: userId, trip_id: tripId })
    .single();

  if (existingFavorite) {
    const { error } = await supabaseAdmin
      .from('favorite_trips')
      .delete()
      .match({ id: existingFavorite.id });
    if (error) {
      console.error('ERRORE SUPABASE (DELETE):', error);
      throw new Error('Impossibile rimuovere il preferito.');
    }
  } else {
    const { error } = await supabaseAdmin
      .from('favorite_trips')
      .insert({ user_id: userId, trip_id: tripId });
    if (error) {
      console.error('ERRORE SUPABASE (INSERT):', error);
      throw new Error('Impossibile aggiungere il preferito.');
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/scopri');
  revalidatePath('/dashboard/preferiti');
  revalidatePath(`/viaggi/${tripId}`);
}