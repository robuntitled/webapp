import 'server-only';

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { USER_PROFILE_SELECT, type UserProfile, type UserSettings } from '@/types/user';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Utente non autenticato.');
  }
  return session;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(USER_PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Errore recupero profilo:', error);
    return null;
  }

  return data as UserProfile;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      'email, marketing_consent, hashedPassword, phone_e164, phone_verified_at, email_verified_at, phone_otp_send_count'
    )
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Errore recupero impostazioni:', error);
    return null;
  }

  return {
    email: data.email,
    marketing_consent: data.marketing_consent,
    canChangePassword: !!data.hashedPassword,
    phone_e164: data.phone_e164 ?? null,
    phone_verified_at: data.phone_verified_at ?? null,
    email_verified_at: data.email_verified_at ?? null,
    phone_otp_pending:
      !data.phone_verified_at && Number(data.phone_otp_send_count ?? 0) >= 1,
  };
}