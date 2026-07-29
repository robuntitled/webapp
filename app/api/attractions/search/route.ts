import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchAttractions } from '@/lib/attractions/search';
import { guardPaidApi } from '@/lib/api/request-guard';

const schema = z.object({
  city: z.string().trim().min(2).max(80),
  query: z.string().trim().max(120).optional().default(''),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  withTours: z.boolean().optional().default(false),
  freeOnly: z.boolean().optional().default(false),
  minRating: z.number().min(0).max(5).optional().default(0),
  sort: z.enum(['rating', 'default']).optional().default('default'),
  start: z.coerce.number().int().min(1).max(500).optional().default(1),
});

export async function POST(request: Request) {
  const gate = await guardPaidApi(request, 'attractions-search', {
    perUser: 30,
    perIp: 50,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const { city, query, startDate, endDate, withTours, freeOnly, minRating, sort, start } =
    parsed.data;
  const result = await searchAttractions({
    city,
    query: query || undefined,
    startDate,
    endDate,
    withTours,
    freeOnly,
    minRating: minRating || undefined,
    sort,
    start,
  });

  return NextResponse.json(result);
}
