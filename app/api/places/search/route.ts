import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchPlaces } from '@/lib/places/nominatim';
import { rateLimit } from '@/lib/rate-limit';

const querySchema = z.object({
  q: z.string().min(2).max(120),
  /** attraction | activity | meal — filtra POI per categoria composer */
  category: z.enum(['attraction', 'activity', 'meal']).optional(),
});

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  const limited = rateLimit(`places:${ip}`, { limit: 30, windowMs: 60_000 });

  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Troppe ricerche, riprova tra poco' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const categoryRaw = searchParams.get('category');
  const parsed = querySchema.safeParse({
    q: searchParams.get('q') ?? '',
    category:
      categoryRaw === 'attraction' || categoryRaw === 'activity' || categoryRaw === 'meal'
        ? categoryRaw
        : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Query troppo corta' }, { status: 400 });
  }

  try {
    const results = await searchPlaces(parsed.data.q, {
      limit: 12,
      category: parsed.data.category,
    });
    return NextResponse.json({ results, category: parsed.data.category ?? null });
  } catch {
    return NextResponse.json({ error: 'Ricerca luoghi non disponibile' }, { status: 502 });
  }
}