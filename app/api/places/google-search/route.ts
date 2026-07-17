import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchActivitiesInBounds } from '@/lib/places/activity-search';

const schema = z.object({
  q: z.string().min(2).max(120),
  bounds: z
    .array(
      z.object({
        lat: z.number(),
        lng: z.number(),
        radiusKm: z.number().optional(),
        label: z.string().optional(),
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

  const { results, source, warning } = await searchActivitiesInBounds(
    parsed.data.q,
    parsed.data.bounds
  );
  return NextResponse.json({ results, source, warning });
}
