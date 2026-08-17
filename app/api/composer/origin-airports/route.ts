import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { suggestOriginAirports } from '@/lib/composer/suggest-origin-airports';
import { rateLimitAsync } from '@/lib/rate-limit';

export const maxDuration = 30;

const schema = z.object({
  q: z.string().trim().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  destination: z.string().trim().max(120).optional(),
  destinationLat: z.coerce.number().min(-90).max(90).optional(),
  destinationLng: z.coerce.number().min(-180).max(180).optional(),
  destinationCountry: z.string().trim().max(80).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  if (!isLiteApiConfigured()) {
    return NextResponse.json(
      { error: 'LITEAPI_KEY assente', airports: [], configured: false },
      { status: 503 }
    );
  }

  const limited = await rateLimitAsync(`origin-airports:${session.user.id}`, {
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Troppe ricerche' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({
    q: searchParams.get('q') ?? undefined,
    lat: searchParams.get('lat') ?? undefined,
    lng: searchParams.get('lng') ?? undefined,
    destination: searchParams.get('destination') ?? undefined,
    destinationLat: searchParams.get('destinationLat') ?? undefined,
    destinationLng: searchParams.get('destinationLng') ?? undefined,
    destinationCountry: searchParams.get('destinationCountry') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const q = parsed.data.q?.trim() ?? '';
  if (q.length < 2 && (parsed.data.lat == null || parsed.data.lng == null)) {
    return NextResponse.json({ airports: [], queryLabel: '' });
  }

  try {
    const result = await suggestOriginAirports({
      query: q,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      destination: parsed.data.destination,
      destinationMeta:
        parsed.data.destinationLat != null && parsed.data.destinationLng != null
          ? {
              label: parsed.data.destination ?? '',
              lat: parsed.data.destinationLat,
              lng: parsed.data.destinationLng,
              country: parsed.data.destinationCountry,
            }
          : undefined,
    });
    return NextResponse.json({
      configured: true,
      provider: 'liteapi',
      queryLabel: result.queryLabel,
      airports: result.airports,
    });
  } catch (e) {
    console.error('[origin-airports]', e);
    return NextResponse.json({ error: 'Ricerca aeroporti non disponibile' }, { status: 502 });
  }
}
