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

export async function handleOAuthSignIn(
  user: User,
  account?: Account | null
): Promise<boolean> {
  if (account?.provider === 'credentials') return true;

  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', user.email!)
      .single();

    if (!existingUser && user.name) {
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');

      await supabaseAdmin.from('users').insert({
        email: user.email,
        image: user.image,
        first_name: firstName,
        last_name: lastName,
        privacy_consent: false,
        marketing_consent: false,
      });
    }
    return true;
  } catch (error) {
    console.error('SignIn Callback Error:', error);
    return false;
  }
}

export async function populateJwtToken(token: JWT): Promise<JWT> {
  if (!token.email) return token;

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, image, privacy_consent')
    .eq('email', token.email)
    .single();

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