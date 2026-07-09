'use server';

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import {
  changePasswordSchema,
  parseProfileFormData,
  updateSettingsSchema,
} from '@/lib/validations/user';
import { ZodError } from 'zod';
import {
  buildMarketingConsentFields,
  buildPrivacyConsentFields,
} from '@/lib/privacy/consent';

export async function updateUserAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  const userId = session.user.id;

  const file = formData.get('avatar') as File;
  if (!file || file.size === 0) throw new Error('Nessun file selezionato.');

  const filePath = `${userId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(filePath, file);
  if (uploadError) {
    console.error('Errore upload avatar:', uploadError);
    throw new Error("Impossibile caricare l'immagine.");
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
  if (!publicUrl) {
    throw new Error("Impossibile ottenere l'URL dell'immagine.");
  }

  const { error: dbError } = await supabaseAdmin
    .from('users')
    .update({ image: publicUrl })
    .eq('id', userId);
  if (dbError) {
    console.error('Errore aggiornamento DB con nuovo avatar:', dbError);
    throw new Error('Impossibile aggiornare la foto profilo.');
  }

  revalidatePath('/dashboard/profilo');
  return { success: true, newImageUrl: publicUrl };
}

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  const userId = session.user.id;

  let parsed;
  try {
    parsed = parseProfileFormData(formData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.issues[0]?.message ?? 'Dati del profilo non validi');
    }
    throw error;
  }

  const phoneNumber = parsed.phone_number?.trim()
    ? `${parsed.phone_prefix ?? '+39'} ${parsed.phone_number.trim()}`
    : null;

  const profileData = {
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    birth_date: parsed.birth_date || null,
    gender: parsed.gender || null,
    phone_number: phoneNumber,
    country: parsed.country || null,
    address_city: parsed.address_city || null,
    address_street: parsed.address_street || null,
    address_number: parsed.address_number || null,
    address_postal_code: parsed.address_postal_code || null,
    ...buildPrivacyConsentFields(true),
    ...buildMarketingConsentFields(parsed.marketing_consent === 'on'),
  };

  const { error } = await supabaseAdmin.from('users').update(profileData).eq('id', userId);
  if (error) {
    console.error('Errore aggiornamento profilo:', error);
    throw new Error('Impossibile aggiornare il profilo.');
  }

  revalidatePath('/dashboard/profilo');
  return { success: true, message: 'Profilo aggiornato con successo!' };
}

export async function updateUserSettings(marketingConsent: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  const userId = session.user.id;

  const parsed = updateSettingsSchema.parse({
    marketing_consent: marketingConsent,
  });

  const { error } = await supabaseAdmin
    .from('users')
    .update(buildMarketingConsentFields(parsed.marketing_consent))
    .eq('id', userId);

  if (error) {
    console.error('Errore aggiornamento impostazioni:', error);
    throw new Error('Impossibile aggiornare le impostazioni.');
  }

  revalidatePath('/dashboard/impostazioni');
  return { success: true, message: 'Impostazioni aggiornate con successo!' };
}

export async function changeUserPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');
  const userId = session.user.id;

  const parsed = changePasswordSchema.parse({
    oldPassword: formData.get('oldPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('hashedPassword')
    .eq('id', userId)
    .single();

  if (!user?.hashedPassword) {
    throw new Error('Impossibile modificare la password per un utente social.');
  }

  const passwordsMatch = await bcrypt.compare(parsed.oldPassword, user.hashedPassword);
  if (!passwordsMatch) {
    throw new Error('La vecchia password non è corretta.');
  }

  const newHashedPassword = await bcrypt.hash(parsed.newPassword, 12);

  const { error } = await supabaseAdmin
    .from('users')
    .update({ hashedPassword: newHashedPassword })
    .eq('id', userId);

  if (error) {
    console.error('Errore cambio password:', error);
    throw new Error('Impossibile cambiare la password.');
  }

  return { success: true, message: 'Password cambiata con successo!' };
}

export async function changeUserEmail(newEmail: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Utente non autenticato.');

  if (!newEmail || !newEmail.includes('@')) {
    throw new Error('Indirizzo email non valido.');
  }

  return {
    success: true,
    message: "A breve riceverai un'email di conferma al nuovo indirizzo.",
  };
}