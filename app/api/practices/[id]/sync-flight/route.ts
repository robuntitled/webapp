import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncPracticeFlightStatus } from '@/lib/data/flight-sync';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await syncPracticeFlightStatus(id, session.user.id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
