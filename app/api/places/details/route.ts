import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPaidApi } from '@/lib/api/request-guard';
import { getPlaceDetails } from '@/lib/places/google-place-details';

const schema = z.object({
  placeId: z.string().min(3).max(200),
});

export async function POST(request: Request) {
  const gate = await guardPaidApi(request, 'places-details', {
    perUser: 60,
    perIp: 80,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'placeId non valido' }, { status: 400 });
  }

  const result = await getPlaceDetails(parsed.data.placeId);
  if (!result.ok || !result.place) {
    return NextResponse.json(
      { error: result.error ?? 'Dettagli non disponibili' },
      { status: 502 }
    );
  }

  return NextResponse.json({ place: result.place, source: result.place.source });
}

export async function GET(request: Request) {
  const gate = await guardPaidApi(request, 'places-details', {
    perUser: 60,
    perIp: 80,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  const placeId = new URL(request.url).searchParams.get('placeId') ?? '';
  const parsed = schema.safeParse({ placeId });
  if (!parsed.success) {
    return NextResponse.json({ error: 'placeId non valido' }, { status: 400 });
  }

  const result = await getPlaceDetails(parsed.data.placeId);
  if (!result.ok || !result.place) {
    return NextResponse.json(
      { error: result.error ?? 'Dettagli non disponibili' },
      { status: 502 }
    );
  }

  return NextResponse.json({ place: result.place, source: result.place.source });
}
