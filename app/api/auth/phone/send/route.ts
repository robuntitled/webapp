import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { clientIp, rateLimitJson } from '@/lib/api/request-guard';
import { normalizePhoneE164 } from '@/lib/phone/normalize';
import { sendPhoneOtp } from '@/lib/phone/verify';

const schema = z.object({
  phone: z.string().min(6).max(30),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const ipBlock = await rateLimitJson(
    `phone-send:ip:${clientIp(request)}`,
    { limit: 8, windowMs: 15 * 60_000 },
    'Troppe richieste SMS. Riprova più tardi.'
  );
  if (ipBlock) return ipBlock;

  const userBlock = await rateLimitJson(
    `phone-send:user:${session.user.id}`,
    { limit: 5, windowMs: 15 * 60_000 },
    'Hai raggiunto il limite di invii. Riprova tra 15 minuti.'
  );
  if (userBlock) return userBlock;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Numero non valido' }, { status: 400 });
  }

  const norm = normalizePhoneE164(parsed.data.phone);
  if (!norm.ok) {
    return NextResponse.json({ error: norm.error }, { status: 400 });
  }

  const result = await sendPhoneOtp(session.user.id, norm.e164);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    message:
      result.mode === 'dev'
        ? 'Codice generato (dev: vedi log server). Inseriscilo qui sotto.'
        : 'Ti abbiamo inviato un SMS con il codice di verifica.',
  });
}
