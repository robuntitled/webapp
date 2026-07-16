import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchGooglePlacesInBounds } from '@/lib/places/google-text-search';

const schema = z.object({
  q: z.string().min(2).max(120),
  bounds: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().optional(),
      })
    )
    .min(1)
    .max(6),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const results = await searchGooglePlacesInBounds(parsed.data.q, parsed.data.bounds);
  return NextResponse.json({ results });
}