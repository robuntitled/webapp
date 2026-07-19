import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listChatGroupsForUser } from '@/lib/data/trip-chat';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const groups = await listChatGroupsForUser(session.user.id);
    const unreadTotal = groups.reduce((n, g) => n + g.unreadCount, 0);
    return NextResponse.json({ groups, unreadTotal });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore chat';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
