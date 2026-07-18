import { NextResponse } from 'next/server';
import { z } from 'zod';
import { issueEmailVerification } from '@/lib/auth/email-verification';
import { clientIp, rateLimitJson } from '@/lib/api/request-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';

const schema = z.object({
  email: z.string().email(),
});

/**
 * Reinvia link di verifica. Risposta sempre generica (no user enumeration).
 */
export async function POST(request: Request) {
  const blocked = await rateLimitJson(
    `resend-verify:ip:${clientIp(request)}`,
    { limit: 5, windowMs: 15 * 60_000 },
    'Troppe richieste. Riprova più tardi.'
  );
  if (blocked) return blocked;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const emailBlock = await rateLimitJson(
    `resend-verify:email:${email}`,
    { limit: 3, windowMs: 15 * 60_000 },
    'Troppe richieste per questa email.'
  );
  if (emailBlock) return emailBlock;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, email_verified_at, hashedPassword')
    .eq('email', email)
    .maybeSingle();

  // Generic always
  const okBody = {
    ok: true,
    message:
      'Se l’account esiste e non è ancora verificato, riceverai un’email a breve.',
  };

  if (!user?.hashedPassword || user.email_verified_at) {
    return NextResponse.json(okBody);
  }

  try {
    await issueEmailVerification(user.id, user.email);
  } catch (e) {
    console.error('[resend-verification]', e);
  }

  return NextResponse.json(okBody);
}
