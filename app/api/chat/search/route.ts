import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { searchChatMessagesForUser } from '@/lib/data/trip-chat';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const hits = await searchChatMessagesForUser(session.user.id, q);
    return NextResponse.json({ hits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ricerca fallita';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
