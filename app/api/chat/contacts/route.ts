import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listChatContactsForUser } from '@/lib/data/trip-chat';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get('q') ?? undefined;

  try {
    const contacts = await listChatContactsForUser(session.user.id, q);
    return NextResponse.json({ contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore contatti';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
