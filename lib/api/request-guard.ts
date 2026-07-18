import 'server-only';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export function rateLimitJson(
  key: string,
  options: { limit: number; windowMs: number },
  message = 'Troppe richieste, riprova tra poco'
): NextResponse | null {
  const limited = rateLimit(key, options);
  if (limited.ok) return null;
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
    }
  );
}

/** Sessione richiesta. 401 se assente. */
export async function requireUserId(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }),
    };
  }
  return { userId: session.user.id };
}

/**
 * Auth + rate limit per utente (e soft limit per IP).
 * Usato per API a pagamento (Places Google).
 */
export async function guardPaidApi(
  request: Request,
  bucket: string,
  limits: { perUser: number; perIp: number; windowMs?: number }
): Promise<{ userId: string } | { error: NextResponse }> {
  const windowMs = limits.windowMs ?? 60_000;
  const ip = clientIp(request);

  const ipBlock = rateLimitJson(
    `${bucket}:ip:${ip}`,
    { limit: limits.perIp, windowMs },
    'Troppe richieste da questo indirizzo'
  );
  if (ipBlock) return { error: ipBlock };

  const authResult = await requireUserId();
  if ('error' in authResult) return authResult;

  const userBlock = rateLimitJson(
    `${bucket}:user:${authResult.userId}`,
    { limit: limits.perUser, windowMs },
    'Troppe richieste, riprova tra un minuto'
  );
  if (userBlock) return { error: userBlock };

  return authResult;
}
