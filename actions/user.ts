'use server';

import { auth } from '../auth';
import { supabaseAdmin } from '../lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// QUESTA FUNZIONE RIMANE INVARIATA
export async function updateUserAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  const userId = session.user.id;

  const file = formData.get('avatar') as File;
  if (!file || file.size === 0) throw new Error('Nessun file selezionato.');

  const filePath = `${userId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseAdmin.storage.from('avatars').upload(filePath, file);
  if (uploadError) {
    console.error("Errore upload avatar:", uploadError);
    throw new Error("Impossibile caricare l'immagine.");
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
  if (!publicUrl) {
    throw new Error("Impossibile ottenere l'URL dell'immagine.");
  }

  const { error: dbError } = await supabaseAdmin.from('users').update({ image: publicUrl }).eq('id', userId);
  if (dbError) {
    console.error("Errore aggiornamento DB con nuovo avatar:", dbError);
    throw new Error("Impossibile aggiornare la foto profilo.");
  }

  revalidatePath('/dashboard/profilo');
  return { success: true, newImageUrl: publicUrl };
}

// QUESTA FUNZIONE RIMANE INVARIATA
export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  const userId = session.user.id;

  const profileData = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    birth_date: formData.get('birth_date') as string,
    gender: formData.get('gender') as string,
    phone_number: `${formData.get('phone_prefix')} ${formData.get('phone_number_main')}`,
    country: formData.get('country') as string,
    address_city: formData.get('address_city') as string,
    address_street: formData.get('address_street') as string,
    address_number: formData.get('address_number') as string,
    address_postal_code: formData.get('address_postal_code') as string,
    privacy_consent: formData.get('privacy_consent') === 'on',
    marketing_consent: formData.get('marketing_consent') === 'on',
  };
  
  const { error } = await supabaseAdmin.from('users').update(profileData).eq('id', userId);
  if (error) {
    console.error("Errore aggiornamento profilo:", error);
    throw new Error("Impossibile aggiornare il profilo.");
  }

  revalidatePath('/dashboard/profilo');
  return { success: true, message: 'Profilo aggiornato con successo!' };
}


// --- NUOVA FUNZIONE PER CAMBIARE LA PASSWORD ---
export async function changeUserPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  const userId = session.user.id;

  const oldPassword = formData.get('oldPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new Error('Tutti i campi della password sono richiesti.');
  }
  if (newPassword !== confirmPassword) {
    throw new Error('La nuova password e la conferma non coincidono.');
  }
  if (newPassword.length < 8) {
    throw new Error('La nuova password deve essere di almeno 8 caratteri.');
  }

  const supabase = supabaseAdmin;
  const { data: user } = await supabase.from('users').select('hashedPassword').eq('id', userId).single();

  if (!user || !user.hashedPassword) {
    throw new Error("Impossibile modificare la password per un utente social.");
  }

  const passwordsMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
  if (!passwordsMatch) {
    throw new Error('La vecchia password non è corretta.');
  }

  const newHashedPassword = await bcrypt.hash(newPassword, 12);

  const { error } = await supabase
    .from('users')
    .update({ hashedPassword: newHashedPassword })
    .eq('id', userId);

  if (error) {
    console.error("Errore cambio password:", error);
    throw new Error("Impossibile cambiare la password.");
  }

  return { success: true, message: 'Password cambiata con successo!' };
}


// --- NUOVA FUNZIONE PER CAMBIARE L'EMAIL (per ora, segnaposto) ---
export async function changeUserEmail(newEmail: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  
  if (!newEmail || !newEmail.includes('@')) {
    throw new Error("Indirizzo email non valido.");
  }
  
  // QUI IN FUTURO:
  // 1. Genera un token di verifica unico.
  // 2. Salva il token e la nuova email nel database.
  // 3. Invia un'email all'indirizzo 'newEmail' con un link di conferma contenente il token.
  // 4. L'utente clicca il link, noi verifichiamo il token e solo allora aggiorniamo l'email.

  console.log("Richiesta di cambio email ricevuta per:", newEmail);
  return { success: true, message: "A breve riceverai un'email di conferma al nuovo indirizzo." };
}