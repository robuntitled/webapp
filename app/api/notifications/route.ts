import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  countUnreadNotifications,
  listNotificationsForUser,
} from '@/lib/data/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotificationsForUser(session.user.id, 20),
      countUnreadNotifications(session.user.id),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore notifiche';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
