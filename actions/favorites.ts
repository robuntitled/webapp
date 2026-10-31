'use server';

import { auth } from '@/auth';
import { scopedForUser } from '@/lib/supabase-scoped';
import { revalidatePath } from 'next/cache';

export async function toggleFavoriteItinerary(
  templateId: string
): Promise<{ saved: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { saved: false, error: 'Accedi per salvare l’itinerario.' };
  }
  const userId = session.user.id;
  if (!templateId.trim()) return { saved: false, error: 'Itinerario non valido.' };
  const { db } = scopedForUser(userId);

  const { data: existing } = await db
    .from('favorite_itineraries')
    .select('id')
    .match({ user_id: userId, template_id: templateId })
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from('favorite_itineraries')
      .delete()
      .match({ id: existing.id, user_id: userId });
    if (error) {
      if (error.code === '42P01') {
        return { saved: false, error: 'Preferiti itinerari non ancora sul database.' };
      }
      return { saved: true, error: 'Impossibile togliere il like.' };
    }
    revalidatePath('/pratiche');
    revalidatePath('/organizza');
    revalidatePath('/dashboard/preferiti');
    return { saved: false };
  }

  const { error } = await db
    .from('favorite_itineraries')
    .insert({ user_id: userId, template_id: templateId });
  if (error) {
    if (error.code === '42P01') {
      return { saved: false, error: 'Preferiti itinerari non ancora sul database.' };
    }
    return { saved: false, error: 'Impossibile salvare l’itinerario.' };
  }
  revalidatePath('/pratiche');
  revalidatePath('/organizza');
  revalidatePath('/dashboard/preferiti');
  return { saved: true };
}
