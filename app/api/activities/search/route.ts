import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchAffiliateActivities } from '@/lib/activities/search';
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
});

export async function POST(request: Request) {
  const gate = await guardPaidApi(request, 'activities-search', {
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

  try {
    const { results, providers, warnings } = await searchAffiliateActivities({
      city: parsed.data.city,
      query: parsed.data.query || undefined,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });
    return NextResponse.json({ results, providers, warnings });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ricerca fallita';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
