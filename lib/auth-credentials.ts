import type { User } from 'next-auth';
import { CredentialsSignin } from 'next-auth';
import bcrypt from 'bcryptjs';
import { rateLimitAsync } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';

/** Login bloccato: email non ancora verificata. */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = 'email_not_verified';
}

/**
 * Login email/password con rate limit anti-brute force + require email verified.
 */
export async function authorizeCredentials(
  email: string,
  password: string
): Promise<(User & { id: string }) | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;

  const byEmail = await rateLimitAsync(`login:email:${normalized}`, {
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!byEmail.ok) {
    return null;
  }

  const globalSoft = await rateLimitAsync('login:global', {
    limit: 80,
    windowMs: 15 * 60_000,
  });
  if (!globalSoft.ok) {
    return null;
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select(
      'id, email, first_name, last_name, image, hashedPassword, email_verified_at'
    )
    .eq('email', normalized)
    .maybeSingle();

  if (!user?.hashedPassword) return null;

  const passwordsMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordsMatch) return null;

  // Password ok ma email non verificata → errore distinto (UI può guidare l’utente)
  if (!user.email_verified_at) {
    throw new EmailNotVerifiedError();
  }

  return {
    id: user.id,
    email: user.email,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    image: user.image,
  };
}
