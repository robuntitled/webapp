import 'server-only';

import { getAppBaseUrl } from '@/lib/auth/app-url';

export type SendEmailResult =
  | { ok: true; mode: 'resend' | 'log' }
  | { ok: false; error: string };

/**
 * Invio email: Resend se RESEND_API_KEY, altrimenti log server (dev / fallback).
 * Non blocca la registrazione se il provider fallisce — il link resta in log in dev.
 */
export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'NomadLink <onboarding@resend.dev>';

  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('[email] Resend error:', res.status, body.slice(0, 300));
        return { ok: false, error: `Resend HTTP ${res.status}` };
      }
      return { ok: true, mode: 'resend' };
    } catch (e) {
      console.error('[email] Resend fetch failed:', e);
      return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
    }
  }

  // Fallback dev: log del contenuto (niente secret token in chiaro se non è il link completo)
  console.info('[email:dev-fallback]', {
    to: options.to,
    subject: options.subject,
    text: options.text,
    app: getAppBaseUrl(),
  });
  return { ok: true, mode: 'log' };
}
