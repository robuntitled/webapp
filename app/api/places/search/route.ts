import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { clientIp, rateLimitJson } from '@/lib/api/request-guard';
import { searchPlaces } from '@/lib/places/nominatim';
import { searchGooglePlacesInBounds } from '@/lib/places/google-text-search';
import type { PlaceResult } from '@/lib/places/types';

const querySchema = z.object({
  q: z.string().min(2).max(120),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
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
  const parsed = querySchema.safeParse({
    q: searchParams.get('q') ?? '',
    lat: searchParams.get('lat') ?? undefined,
    lng: searchParams.get('lng') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Query troppo corta' }, { status: 400 });
  }

  const { q, lat, lng } = parsed.data;

  // Con coordinate della meta: ricerca Google biasata sul luogo (POI vicini),
  // così "ristoranti" a Suva non torna ristoranti a Roma.
  if (lat != null && lng != null) {
    try {
      const g = await searchGooglePlacesInBounds(q, [{ lat, lng }], 60);
      if (g.ok && g.results.length > 0) {
        const results: PlaceResult[] = g.results.map((r) => ({
          id: r.id,
          label: r.label,
          subtitle: r.subtitle,
          lat: r.lat,
          lng: r.lng,
          placeType: r.primaryType ?? 'poi',
          placeTypeLabel: r.placeTypeLabel,
        }));
        return NextResponse.json({ results });
      }
    } catch {
      // fallback a Nominatim sotto
    }
  }

  try {
    const results = await searchPlaces(q, 12);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: 'Ricerca luoghi non disponibile' },
      { status: 502 }
    );
  }
}
