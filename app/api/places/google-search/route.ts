import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPaidApi } from '@/lib/api/request-guard';
import { searchActivitiesInBounds } from '@/lib/places/activity-search';

const schema = z.object({
  /** Vuoto = luoghi nell'area per categoria; con testo = ricerca filtrata */
  q: z.string().max(120).optional().default(''),
  category: z
    .enum(['attraction', 'meal', 'activity', 'shopping', 'hotel'])
    .optional()
    .default('attraction'),
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
  const gate = await guardPaidApi(request, 'places-search', {
    perUser: 40,
    perIp: 60,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const { results, source, warning, category } = await searchActivitiesInBounds(
    parsed.data.q ?? '',
    parsed.data.bounds,
    80,
    parsed.data.category
  );
  return NextResponse.json({ results, source, warning, category: category ?? null });
}
