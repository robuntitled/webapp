import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, rateLimitJson, requireUserId } from '@/lib/api/request-guard';
import { searchPlaces } from '@/lib/places/nominatim';

const querySchema = z.object({
  q: z.string().min(2).max(120),
});

/** Destinazioni (Nominatim) — auth + rate limit (evita scrapers). */
export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ('error' in authResult) return authResult.error;

  const ipBlock = await rateLimitJson(
    `nominatim:ip:${clientIp(request)}`,
    { limit: 30, windowMs: 60_000 }
  );
  if (ipBlock) return ipBlock;

  const userBlock = await rateLimitJson(
    `nominatim:user:${authResult.userId}`,
    { limit: 40, windowMs: 60_000 }
  );
  if (userBlock) return userBlock;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get('q') ?? '' });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Query troppo corta' }, { status: 400 });
  }

  try {
    const results = await searchPlaces(parsed.data.q, 12);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Ricerca luoghi non disponibile' }, { status: 502 });
  }
}
