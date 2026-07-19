import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hideTripChat } from '@/lib/data/trip-chat';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ tripId: string }> };

/** Nasconde la chat per l’utente corrente (non cancella i messaggi del gruppo). */
export async function POST(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { tripId } = await context.params;

  try {
    await hideTripChat(tripId, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossibile eliminare la chat';
    const status = message.includes('Non fai parte') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
