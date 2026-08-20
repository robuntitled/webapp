import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type NotificationType =
  | 'trip_join_request'
  | 'trip_join_accepted'
  | 'trip_join_rejected'
  | 'trip_feedback'
  | 'second_trip'
  | 'day90_incentive'
  | 'dormant'
  | 'threshold_near'
  | 'threshold_reached';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === '42P01';
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('user_notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .maybeSingle();

  if (error) {
    if (!isMissingTable(error)) {
      console.error('[createNotification]', error.message);
    }
    return null;
  }
  return (data?.id as string) ?? null;
}

export async function listNotificationsForUser(
  userId: string,
  limit = 20
): Promise<AppNotification[]> {
  const { data, error } = await supabaseAdmin
    .from('user_notifications')
    .select('id, type, title, body, link, metadata, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    if (error && !isMissingTable(error)) {
      console.error('[listNotifications]', error.message);
    }
    return [];
  }

  const items = data.map((row) => ({
    id: row.id as string,
    type: row.type as NotificationType,
    title: String(row.title ?? ''),
    body: (row.body as string | null) ?? null,
    link: (row.link as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    readAt: (row.read_at as string | null) ?? null,
    createdAt: String(row.created_at),
  }));

  return attachJoinRequestStatus(items);
}

async function attachJoinRequestStatus(
  items: AppNotification[]
): Promise<AppNotification[]> {
  const requestIds = [
    ...new Set(
      items
        .filter((n) => n.type === 'trip_join_request')
        .map((n) =>
          typeof n.metadata.requestId === 'string' ? n.metadata.requestId : null
        )
        .filter((id): id is string => !!id)
    ),
  ];
  if (!requestIds.length) return items;

  const { data, error } = await supabaseAdmin
    .from('trip_join_requests')
    .select('id, status')
    .in('id', requestIds);

  if (error || !data?.length) return items;

  const statusById = new Map(
    data.map((row) => [row.id as string, String(row.status)])
  );

  return items.map((n) => {
    if (n.type !== 'trip_join_request') return n;
    const requestId =
      typeof n.metadata.requestId === 'string' ? n.metadata.requestId : null;
    if (!requestId) return n;
    return {
      ...n,
      metadata: {
        ...n.metadata,
        requestStatus: statusById.get(requestId) ?? 'unknown',
      },
    };
  });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    if (!isMissingTable(error)) {
      console.error('[countUnreadNotifications]', error.message);
    }
    return 0;
  }
  return count ?? 0;
}
