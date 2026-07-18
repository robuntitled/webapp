import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { clientIp, rateLimitJson } from '@/lib/api/request-guard';
import { confirmPhoneOtp } from '@/lib/phone/verify';
import { maskPhoneE164 } from '@/lib/phone/normalize';

const schema = z.object({
  code: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const ipBlock = await rateLimitJson(
    `phone-confirm:ip:${clientIp(request)}`,
    { limit: 20, windowMs: 15 * 60_000 }
  );
  if (ipBlock) return ipBlock;

  const userBlock = await rateLimitJson(
    `phone-confirm:user:${session.user.id}`,
    { limit: 15, windowMs: 15 * 60_000 }
  );
  if (userBlock) return userBlock;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Codice non valido' }, { status: 400 });
  }

  const result = await confirmPhoneOtp(session.user.id, parsed.data.code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    phoneMasked: maskPhoneE164(result.e164),
    phoneVerified: true,
    message: 'Numero verificato con successo.',
  });
}
