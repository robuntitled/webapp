import type { User } from 'next-auth';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Login email/password con rate limit anti-brute force.
 * - per email: max 8 tentativi / 15 min
 * - globale soft: max 40 tentativi / 15 min su chiave fissa (istanza)
 */
export async function authorizeCredentials(
  email: string,
  password: string
): Promise<(User & { id: string }) | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return null;

  const byEmail = rateLimit(`login:email:${normalized}`, {
    limit: 8,
    windowMs: 15 * 60_000,
  });
  if (!byEmail.ok) {
    // Non rivelare se l'email esiste
    return null;
  }

  const globalSoft = rateLimit('login:global', {
    limit: 80,
    windowMs: 15 * 60_000,
  });
  if (!globalSoft.ok) {
    return null;
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, image, hashedPassword')
    .eq('email', normalized)
    .maybeSingle();

  if (!user?.hashedPassword) return null;

  const passwordsMatch = await bcrypt.compare(password, user.hashedPassword);
  if (!passwordsMatch) return null;

  return {
    id: user.id,
    email: user.email,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    image: user.image,
  };
}