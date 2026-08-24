import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canAccessTripChat, markTripChatRead } from '@/lib/data/trip-chat';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ tripId: string }> };

export async function POST(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { tripId } = await context.params;
  const allowed = await canAccessTripChat(tripId, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: 'Accesso non consentito' }, { status: 403 });
  }

  await markTripChatRead(tripId, session.user.id);
  return NextResponse.json({ ok: true });
}
