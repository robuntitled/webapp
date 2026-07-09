'use server';

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseTripFormData } from '@/lib/validations/trip';
import { ZodError } from 'zod';

function toTripRecord(parsed: ReturnType<typeof parseTripFormData>) {
  return {
    title: parsed.title,
    destination: parsed.destination,
    start_date: parsed.startDate,
    end_date: parsed.endDate,
    description: parsed.description,
    image_url: parsed.image_url || null,
    price: parsed.price,
    min_participants: parsed.minParticipants,
    max_participants: parsed.maxParticipants,
    min_age: parsed.minAge,
    max_age: parsed.maxAge,
    planning_mode: parsed.planningMode,
  };
}

export async function createTrip(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Devi essere loggato per creare un viaggio.');
  }

  let parsed;
  try {
    parsed = parseTripFormData(formData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.issues[0]?.message ?? 'Dati del viaggio non validi');
    }
    throw error;
  }

  const { data: created, error } = await supabaseAdmin
    .from('trips')
    .insert([
      {
        ...toTripRecord(parsed),
        creator_id: session.user.id,
      },
    ])
    .select('id')
    .single();

  if (error || !created) {
    console.error('Errore nella creazione del viaggio:', error);
    throw new Error(error?.message ?? 'Creazione viaggio fallita');
  }

  const { error: ownerError } = await supabaseAdmin.from('trip_participants').insert({
    trip_id: created.id,
    user_id: session.user.id,
    role: 'owner',
  });

  if (ownerError && ownerError.code !== '23505') {
    console.error('Errore assegnazione ruolo organizzatore:', ownerError);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/miei-viaggi');
  redirect(`/viaggi/${created.id}`);
}

export async function updateTrip(tripId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Devi essere loggato per modificare un viaggio.');
  }

  let parsed;
  try {
    parsed = parseTripFormData(formData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.issues[0]?.message ?? 'Dati del viaggio non validi');
    }
    throw error;
  }

  const { error } = await supabaseAdmin
    .from('trips')
    .update(toTripRecord(parsed))
    .match({ id: tripId, creator_id: session.user.id });

  if (error) {
    console.error('Errore nella modifica del viaggio:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/miei-viaggi');
  revalidatePath(`/viaggi/${tripId}`);
  redirect('/dashboard/miei-viaggi');
}