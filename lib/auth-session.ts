import type { Account, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const PROTECTED_PATHS = [
  '/dashboard/crea',
  '/dashboard/miei-viaggi',
  '/dashboard/profilo',
  '/dashboard/impostazioni',
  '/dashboard/preferiti',
  '/dashboard/viaggi',
];

export const GDPR_PUBLIC_PATHS = [
  '/',
  '/privacy',
  '/termini',
  '/cookie',
  '/completa-registrazione',
];

function splitDisplayName(name?: string | null, email?: string | null) {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return {
      firstName: parts[0] || 'Utente',
      lastName: parts.slice(1).join(' '),
    };
  }
  const local = email?.split('@')[0]?.trim();
  return {
    firstName: local || 'Utente',
    lastName: '',
  };
}

export async function handleOAuthSignIn(
  user: User,
  account?: Account | null
): Promise<boolean> {
  if (account?.provider === 'credentials') return true;

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    console.error('OAuth sign-in: email mancante dal provider', account?.provider);
    return false;
  }

  try {
    const { data: existingUser, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      console.error('OAuth user lookup error:', lookupError);
      return false;
    }

    if (!existingUser) {
      const { firstName, lastName } = splitDisplayName(user.name, email);
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        email,
        image: user.image,
        first_name: firstName,
        last_name: lastName,
        privacy_consent: false,
        marketing_consent: false,
      });

      if (insertError) {
        console.error('OAuth user insert error:', insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('SignIn Callback Error:', error);
    return false;
  }
}

export async function populateJwtToken(token: JWT): Promise<JWT> {
  if (!token.email) return token;

  const { data: dbUser, error } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, image, privacy_consent')
    .eq('email', token.email)
    .maybeSingle();

  if (error) {
    console.error('JWT populate user lookup error:', error);
    return token;
  }

  if (dbUser) {
    token.id = dbUser.id;
    token.name = `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim();
    token.picture = dbUser.image;
    token.privacyConsentAccepted = !!dbUser.privacy_consent;
  }

  return token;
}

export function populateSession(session: Session, token: JWT): Session {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.name = token.name as string | null;
    session.user.image = token.picture as string | null;
    session.user.privacyConsentAccepted = !!token.privacyConsentAccepted;
  }
  return session;
}