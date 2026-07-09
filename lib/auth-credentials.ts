import type { User } from 'next-auth';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function authorizeCredentials(
  email: string,
  password: string
): Promise<(User & { id: string }) | null> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, image, hashedPassword')
    .eq('email', email)
    .single();

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