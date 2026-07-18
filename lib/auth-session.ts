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

/** Token JWT da invalidare (account cancellato o non più presente in DB). */
export function invalidateJwtToken(token: JWT): JWT {
  return {
    ...token,
    id: undefined,
    email: undefined,
    name: undefined,
    picture: undefined,
    privacyConsentAccepted: false,
    invalid: true,
    invalidAt: Date.now(),
  };
}

export function isJwtInvalid(token: JWT | null | undefined): boolean {
  return Boolean(token?.invalid) || !token?.id;
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
        // OAuth: email già verificata dal provider
        email_verified_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('OAuth user insert error:', insertError);
        return false;
      }
    } else {
      // Account esistente: OAuth conferma l’email (anche se registrato con password non verificata)
      const patch: Record<string, unknown> = {
        email_verified_at: new Date().toISOString(),
        email_verify_token_hash: null,
        email_verify_expires_at: null,
      };
      if (user.image) patch.image = user.image;
      await supabaseAdmin.from('users').update(patch).eq('id', existingUser.id);
    }

    return true;
  } catch (error) {
    console.error('SignIn Callback Error:', error);
    return false;
  }
}

/**
 * Sincronizza JWT con la riga `users`.
 * Se l’utente non esiste più (delete account) → token invalidato.
 * Errori DB transienti: non invalidare (evita logout a raffica).
 */
export async function populateJwtToken(token: JWT): Promise<JWT> {
  // Già invalidato: non rianimare senza email/id
  if (token.invalid && !token.email && !token.id) {
    return token;
  }

  const email =
    typeof token.email === 'string' ? token.email.trim().toLowerCase() : undefined;
  const userId = typeof token.id === 'string' ? token.id : undefined;

  if (!email && !userId) {
    return token;
  }

  let query = supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, image, privacy_consent, email');

  if (userId) {
    query = query.eq('id', userId);
  } else if (email) {
    query = query.eq('email', email);
  }

  const { data: dbUser, error } = await query.maybeSingle();

  if (error) {
    console.error('JWT populate user lookup error:', error);
    // Non invalidare su blip di rete/DB
    return token;
  }

  if (!dbUser) {
    // Account eliminato o email non più associata
    return invalidateJwtToken(token);
  }

  token.invalid = false;
  token.invalidAt = undefined;
  token.id = dbUser.id;
  token.email = dbUser.email ?? email;
  token.name = `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim();
  token.picture = dbUser.image;
  token.privacyConsentAccepted = !!dbUser.privacy_consent;
  token.lastUserCheck = Date.now();

  return token;
}

export function populateSession(session: Session, token: JWT): Session {
  // Sessione “vuota”: middleware e UI trattano come non loggato se manca user.id
  if (isJwtInvalid(token)) {
    return {
      ...session,
      user: {
        id: '',
        name: null,
        email: null,
        image: null,
        privacyConsentAccepted: false,
      },
      expires: new Date(0).toISOString(),
    };
  }

  if (session.user) {
    session.user.id = token.id as string;
    session.user.name = (token.name as string | null) ?? null;
    session.user.email = (token.email as string | null) ?? session.user.email;
    session.user.image = (token.picture as string | null) ?? null;
    session.user.privacyConsentAccepted = !!token.privacyConsentAccepted;
  }
  return session;
}
