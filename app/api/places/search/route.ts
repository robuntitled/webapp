import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { clientIp, rateLimitJson } from '@/lib/api/request-guard';
import { searchPlaces } from '@/lib/places/nominatim';

const querySchema = z.object({
  q: z.string().min(2).max(120),
});

/**
 * Destinazioni (Nominatim) per autocomplete Prenota.
 * Pubblico con rate limit IP (e più alto se loggato) — senza auth le città
 * fuori catalogo aeroporti (es. Ancona) non comparivano.
 */
export async function GET(request: Request) {
  const ip = clientIp(request);
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const ipBlock = await rateLimitJson(`nominatim:ip:${ip}`, {
    limit: userId ? 40 : 20,
    windowMs: 60_000,
  });
  if (ipBlock) return ipBlock;

  if (userId) {
    const userBlock = await rateLimitJson(`nominatim:user:${userId}`, {
      limit: 50,
      windowMs: 60_000,
    });
    if (userBlock) return userBlock;
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get('q') ?? '' });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Query troppo corta' }, { status: 400 });
  }

  try {
    const results = await searchPlaces(parsed.data.q, 12);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: 'Ricerca luoghi non disponibile' },
      { status: 502 }
    );
  }
}
