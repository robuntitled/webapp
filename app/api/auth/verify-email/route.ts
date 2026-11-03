import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/auth/email-verification';
import { getAppBaseUrl } from '@/lib/auth/app-url';
import { safeCallbackPath } from '@/lib/auth/callback-url';
import { rateLimitAsync } from '@/lib/rate-limit';
import { clientIp } from '@/lib/api/request-guard';

/**
 * GET /api/auth/verify-email?token=...&callbackUrl=...
 * Redirect a / con messaggio successo/errore, preservando un callback sicuro.
 */
export async function GET(request: Request) {
  const ip = clientIp(request);
  const limited = await rateLimitAsync(`verify-email:ip:${ip}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.redirect(
      `${getAppBaseUrl()}/?verify=rate_limit`
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const callback = safeCallbackPath(url.searchParams.get('callbackUrl'), '');
  const result = await verifyEmailToken(token);

  if (!result.ok) {
    return NextResponse.redirect(
      `${getAppBaseUrl()}/?verify=error&reason=${encodeURIComponent(result.error)}`
    );
  }

  const qs = new URLSearchParams({
    verify: 'ok',
    email: result.email,
  });
  if (callback) qs.set('callbackUrl', callback);
  return NextResponse.redirect(`${getAppBaseUrl()}/?${qs.toString()}`);
}
