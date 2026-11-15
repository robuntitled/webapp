import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncPracticeFlightStatus } from '@/lib/data/flight-sync';
import { toUserFacingError } from '@/lib/user-facing-error';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const bookingId = url.searchParams.get('bookingId');
  const result = await syncPracticeFlightStatus(id, session.user.id, {
    bookingId,
  });
  if ('error' in result && !('updated' in result)) {
    return NextResponse.json(
      { error: toUserFacingError(result.error, 'Pratica non trovata.') },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
