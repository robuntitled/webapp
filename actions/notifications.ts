'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type NotificationActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function markNotificationRead(
  notificationId: string
): Promise<NotificationActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per continuare.' };

  const id = z.string().uuid().safeParse(notificationId);
  if (!id.success) return { ok: false, error: 'Notifica non valida.' };

  const { error } = await supabaseAdmin
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id.data)
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('[markNotificationRead]', error.message);
    return { ok: false, error: 'Impossibile aggiornare la notifica.' };
  }
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per continuare.' };

  const { error } = await supabaseAdmin
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('[markAllNotificationsRead]', error.message);
    return { ok: false, error: 'Impossibile aggiornare le notifiche.' };
  }
  return { ok: true };
}
