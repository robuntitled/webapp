import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { findCheapestCombo } from '@/lib/liteapi/cheap-combo';
import { clientIp, rateLimitJson } from '@/lib/api/request-guard';

const destSchema = z.object({
  label: z.string().min(1).max(80),
  lat: z.number(),
  lng: z.number(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  placeType: z.string().optional(),
  placeTypeLabel: z.string().optional(),
  subtitle: z.string().optional(),
});

const schema = z.object({
  destinations: z.array(destSchema).min(2).max(4),
  maxDays: z.number().int().min(5).max(21),
  windowStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Accedi per cercare voli.' }, { status: 401 });
  }

  const limited = await rateLimitJson(`cheap-combo:${session.user.id}`, {
    limit: 4,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const ipBlock = await rateLimitJson(`cheap-combo:ip:${clientIp(request)}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (ipBlock) return ipBlock;

  if (!isLiteApiConfigured()) {
    return NextResponse.json({ error: 'Servizio voli non configurato.' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  try {
    const combo = await findCheapestCombo(parsed.data);
    if (!combo) {
      return NextResponse.json({
        found: false,
        message:
          'Nessuna combinazione completa in questa finestra. Allarga le date o prova un altro ordine.',
      });
    }
    return NextResponse.json({ found: true, combo });
  } catch (e) {
    if (e instanceof LiteApiError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    console.error('[cheap-combo]', e);
    return NextResponse.json({ error: 'Ricerca combo non riuscita.' }, { status: 500 });
  }
}
