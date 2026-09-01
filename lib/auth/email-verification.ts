import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import { sendTransactionalEmail } from '@/lib/email/send';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function hashEmailToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateEmailVerifyToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function issueEmailVerification(userId: string, email: string): Promise<{
  token: string;
  verifyUrl: string;
  emailSent: boolean;
  emailMode: 'resend' | 'log' | 'failed';
}> {
  const token = generateEmailVerifyToken();
  const tokenHash = hashEmailToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      email_verify_token_hash: tokenHash,
      email_verify_expires_at: expiresAt,
      // non toccare email_verified_at
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Impossibile salvare token verifica: ${error.message}`);
  }

  const verifyUrl = `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Conferma la tua email — Flygetr';
  const text = [
    'Ciao!',
    '',
    'Conferma la tua email per attivare l’account Flygetr:',
    verifyUrl,
    '',
    'Il link scade tra 24 ore. Se non hai creato tu l’account, ignora questo messaggio.',
  ].join('\n');

  const html = `
    <p>Ciao!</p>
    <p>Conferma la tua email per attivare l’account <strong>Flygetr</strong>.</p>
    <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 20px;background:#7c3aed;color:#fff;border-radius:999px;text-decoration:none;font-weight:600">Conferma email</a></p>
    <p style="color:#666;font-size:13px">Oppure apri questo link:<br/>${verifyUrl}</p>
    <p style="color:#666;font-size:13px">Scade tra 24 ore. Se non hai creato tu l’account, ignora questo messaggio.</p>
  `;

  const sent = await sendTransactionalEmail({
    to: email,
    subject,
    html,
    text,
  });

  return {
    token,
    verifyUrl,
    emailSent: sent.ok,
    emailMode: sent.ok ? sent.mode : 'failed',
  };
}

export async function verifyEmailToken(rawToken: string): Promise<
  | { ok: true; email: string }
  | { ok: false; error: string }
> {
  const token = rawToken.trim();
  if (token.length < 20 || token.length > 200) {
    return { ok: false, error: 'Token non valido' };
  }

  const tokenHash = hashEmailToken(token);
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, email_verify_expires_at, email_verified_at')
    .eq('email_verify_token_hash', tokenHash)
    .maybeSingle();

  if (error || !user) {
    return { ok: false, error: 'Link non valido o già usato' };
  }

  if (user.email_verified_at) {
    return { ok: true, email: user.email };
  }

  const exp = user.email_verify_expires_at
    ? new Date(user.email_verify_expires_at).getTime()
    : 0;
  if (!exp || exp < Date.now()) {
    return { ok: false, error: 'Link scaduto. Registrati di nuovo o richiedi un nuovo link.' };
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      email_verified_at: new Date().toISOString(),
      email_verify_token_hash: null,
      email_verify_expires_at: null,
    })
    .eq('id', user.id);

  if (updateError) {
    return { ok: false, error: 'Impossibile completare la verifica' };
  }

  return { ok: true, email: user.email };
}

/** OAuth: email già verificata dal provider. */
export async function markEmailVerifiedByUserId(userId: string): Promise<void> {
  await supabaseAdmin
    .from('users')
    .update({
      email_verified_at: new Date().toISOString(),
      email_verify_token_hash: null,
      email_verify_expires_at: null,
    })
    .eq('id', userId)
    .is('email_verified_at', null);
}
