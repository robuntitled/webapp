import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/auth/email-verification';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import { rateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/api/request-guard';

/**
 * GET /api/auth/verify-email?token=...
 * Redirect a / con messaggio successo/errore.
 */
export async function GET(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit(`verify-email:ip:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.redirect(
      `${getAppBaseUrl()}/?verify=rate_limit`
    );
  }

  const token = new URL(request.url).searchParams.get('token') ?? '';
  const result = await verifyEmailToken(token);

  if (!result.ok) {
    return NextResponse.redirect(
      `${getAppBaseUrl()}/?verify=error&reason=${encodeURIComponent(result.error)}`
    );
  }

  return NextResponse.redirect(
    `${getAppBaseUrl()}/?verify=ok&email=${encodeURIComponent(result.email)}`
  );
}
