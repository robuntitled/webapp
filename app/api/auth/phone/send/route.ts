import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { clientIp, rateLimitJson } from '@/lib/api/request-guard';
import { normalizePhoneE164 } from '@/lib/phone/normalize';
import { sendPhoneOtp } from '@/lib/phone/verify';

const schema = z.object({
  phone: z.string().min(6).max(30),
  /** Solo da create/join trip */
  purpose: z.literal('trip_action'),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const ipBlock = await rateLimitJson(
    `phone-send:ip:${clientIp(request)}`,
    { limit: 5, windowMs: 60 * 60_000 },
    'Troppe richieste. Riprova più tardi.'
  );
  if (ipBlock) return ipBlock;

  const userBlock = await rateLimitJson(
    `phone-send:user:${session.user.id}`,
    { limit: 2, windowMs: 24 * 60 * 60_000 },
    'Puoi ricevere un solo codice di verifica.'
  );
  if (userBlock) return userBlock;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Il codice WhatsApp si invia solo quando crei o ti unisci a un viaggio (un solo invio).',
      },
      { status: 400 }
    );
  }

  const norm = normalizePhoneE164(parsed.data.phone);
  if (!norm.ok) {
    return NextResponse.json({ error: norm.error }, { status: 400 });
  }

  const result = await sendPhoneOtp(session.user.id, norm.e164, 'trip_action');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const messages: Record<string, string> = {
    whatsapp:
      'Ti abbiamo inviato l’unico codice su WhatsApp (valido 24 ore). Non potremo reinviarlo.',
    twilio: 'Ti abbiamo inviato l’unico SMS con il codice (valido 24 ore). Non potremo reinviarlo.',
    dev: 'Codice generato (dev: log server). Valido 24 ore — un solo invio.',
  };

  return NextResponse.json({
    ok: true,
    mode: result.mode,
    once: true,
    validHours: 24,
    message: messages[result.mode] ?? 'Codice inviato (un solo invio).',
  });
}
