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
  revalidatePath('/dashboard/preferiti');
  revalidatePath(`/viaggi/${tripId}`);
}

export async function toggleFavoriteItinerary(templateId: string): Promise<{ saved: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { saved: false, error: 'Accedi per salvare l’itinerario.' };
  }
  const userId = session.user.id;
  if (!templateId.trim()) return { saved: false, error: 'Itinerario non valido.' };

  const { data: existing } = await supabaseAdmin
    .from('favorite_itineraries')
    .select('id')
    .match({ user_id: userId, template_id: templateId })
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('favorite_itineraries')
      .delete()
      .match({ id: existing.id });
    if (error) {
      if (error.code === '42P01') {
        return { saved: false, error: 'Preferiti itinerari non ancora sul database.' };
      }
      return { saved: true, error: 'Impossibile togliere il like.' };
    }
    revalidatePath('/pratiche');
    revalidatePath('/destinazioni');
    return { saved: false };
  }

  const { error } = await supabaseAdmin
    .from('favorite_itineraries')
    .insert({ user_id: userId, template_id: templateId });
  if (error) {
    if (error.code === '42P01') {
      return { saved: false, error: 'Preferiti itinerari non ancora sul database.' };
    }
    return { saved: false, error: 'Impossibile salvare l’itinerario.' };
  }
  revalidatePath('/pratiche');
  revalidatePath('/destinazioni');
  return { saved: true };
}