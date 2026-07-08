'use server';

import { auth } from '../auth';
import { supabaseAdmin } from '../lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTrip(formData: FormData) {
  const supabase = supabaseAdmin;
  
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Devi essere loggato per creare un viaggio.');
  }

  const tripData = {
    title: formData.get('title') as string,
    destination: formData.get('destination') as string,
    start_date: formData.get('startDate') as string,
    end_date: formData.get('endDate') as string,
    description: formData.get('description') as string,
    image_url: formData.get('image_url') as string,
    price: Number(formData.get('price')),
    min_participants: Number(formData.get('minParticipants')),
    max_participants: Number(formData.get('maxParticipants')),
    min_age: Number(formData.get('minAge')),
    max_age: Number(formData.get('maxAge')),
    creator_id: session.user.id,
  };
  
  const { data, error } = await supabase
    .from('trips')
    .insert([tripData])
    .select();

  if (error) {
    console.error('Errore nella creazione del viaggio:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}