import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, rateLimitJson, requireUserId } from '@/lib/api/request-guard';
import { reverseGeocode } from '@/lib/places/nominatim';

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** Reverse geocode GPS → città (Nominatim server-side). */
export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ('error' in authResult) return authResult.error;

  const ipBlock = await rateLimitJson(
    `nominatim-rev:ip:${clientIp(request)}`,
    { limit: 20, windowMs: 60_000 }
  );
  if (ipBlock) return ipBlock;

  const userBlock = await rateLimitJson(
    `nominatim-rev:user:${authResult.userId}`,
    { limit: 20, windowMs: 60_000 }
  );
  if (userBlock) return userBlock;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: searchParams.get('lat'),
    lng: searchParams.get('lng'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Coordinate non valide' }, { status: 400 });
  }

  try {
    const place = await reverseGeocode(parsed.data.lat, parsed.data.lng);
    if (!place) {
      return NextResponse.json({ error: 'Posizione non trovata' }, { status: 404 });
    }
    return NextResponse.json({ place });
  } catch {
    return NextResponse.json({ error: 'Reverse geocode non disponibile' }, { status: 502 });
  }
}
