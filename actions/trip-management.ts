'use server';

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

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
}
