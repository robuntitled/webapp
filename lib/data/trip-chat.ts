import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ChatContact, ChatGroupItem, ChatSearchHit } from '@/lib/chat/types';
import { getParticipantCount } from '@/lib/trips/display';
import { isTripEnded } from '@/lib/utils/trip';

export type TripMessageRow = {
  id: string;
  trip_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user: {
    id: string;
    username?: string | null;
    first_name: string | null;
    last_name: string | null;
    image: string | null;
  } | null;
};

export async function isTripMember(tripId: string, userId: string): Promise<boolean> {
  const { data: trip } = await supabaseAdmin
    .from('trips')
    .select('creator_id')
    .eq('id', tripId)
    .single();

  if (!trip) return false;
  if (trip.creator_id === userId) return true;

  const { data: participant } = await supabaseAdmin
    .from('trip_participants')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!participant;
}

export async function getTripMessages(
  tripId: string,
  since?: string
): Promise<TripMessageRow[]> {
  let query = supabaseAdmin
    .from('trip_messages')
    .select(
      'id, trip_id, user_id, body, created_at, user:users(id, username, first_name, last_name, image)'
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    ...row,
    user: Array.isArray(row.user) ? row.user[0] ?? null : row.user,
  })) as TripMessageRow[];
}

export async function postTripMessage(
  tripId: string,
  userId: string,
  body: string
): Promise<TripMessageRow> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Messaggio vuoto');

  const member = await isTripMember(tripId, userId);
  if (!member) throw new Error('Non fai parte di questo viaggio');

  // Se era nascosta, riaprila
  await supabaseAdmin
    .from('trip_chat_hides')
    .delete()
    .eq('user_id', userId)
    .eq('trip_id', tripId);

  const { data, error } = await supabaseAdmin
    .from('trip_messages')
    .insert({ trip_id: tripId, user_id: userId, body: trimmed })
    .select(
      'id, trip_id, user_id, body, created_at, user:users(id, username, first_name, last_name, image)'
    )
    .single();

  if (error) throw new Error(error.message);

  const row = data as TripMessageRow & { user: TripMessageRow['user'] | TripMessageRow['user'][] };
  return {
    ...row,
    user: Array.isArray(row.user) ? row.user[0] ?? null : row.user,
  };
}

export async function markTripChatRead(tripId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('trip_chat_reads').upsert(
    {
      user_id: userId,
      trip_id: tripId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,trip_id' }
  );
  if (error && error.code !== '42P01') {
    console.warn('[chat] mark read failed', error.message);
  }
}

export async function hideTripChat(tripId: string, userId: string): Promise<void> {
  const member = await isTripMember(tripId, userId);
  if (!member) throw new Error('Non fai parte di questo viaggio');

  const { error } = await supabaseAdmin.from('trip_chat_hides').upsert(
    {
      user_id: userId,
      trip_id: tripId,
      hidden_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,trip_id' }
  );
  if (error) {
    if (error.code === '42P01') {
      throw new Error('Esegui npm run db:chat-reads');
    }
    throw new Error(error.message);
  }
}

export async function unhideTripChat(tripId: string, userId: string): Promise<void> {
  await supabaseAdmin
    .from('trip_chat_hides')
    .delete()
    .eq('user_id', userId)
    .eq('trip_id', tripId);
}

type MembershipTrip = {
  id: string;
  title: string;
  destination: string;
  imageUrl: string | null;
  endDate: string;
  creator_id?: string | null;
  creator?: { id: string } | null;
  trip_participants?: { user_id: string; role?: string }[];
};

const MEMBERSHIP_SELECT = `
  id, title, destination,
  imageUrl: image_url,
  endDate: end_date,
  creator_id,
  creator:users(id),
  trip_participants(user_id, role)
`;

async function loadMembershipTrips(userId: string): Promise<MembershipTrip[]> {
  const { data: created } = await supabaseAdmin
    .from('trips')
    .select(MEMBERSHIP_SELECT)
    .eq('creator_id', userId);

  const { data: parts } = await supabaseAdmin
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userId);

  const joinedIds = (parts ?? []).map((p) => p.trip_id).filter(Boolean);
  let joined: MembershipTrip[] = [];
  if (joinedIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('trips')
      .select(MEMBERSHIP_SELECT)
      .in('id', joinedIds);
    joined = (data ?? []) as unknown as MembershipTrip[];
  }

  const map = new Map<string, MembershipTrip>();
  for (const t of [...((created ?? []) as unknown as MembershipTrip[]), ...joined]) {
    map.set(t.id, t);
  }
  return [...map.values()].filter((t) => !isTripEnded(t.endDate));
}

export async function listChatGroupsForUser(userId: string): Promise<ChatGroupItem[]> {
  const trips = await loadMembershipTrips(userId);

  const { data: hides } = await supabaseAdmin
    .from('trip_chat_hides')
    .select('trip_id')
    .eq('user_id', userId);
  const hidden = new Set((hides ?? []).map((h) => h.trip_id));

  const { data: reads } = await supabaseAdmin
    .from('trip_chat_reads')
    .select('trip_id, last_read_at')
    .eq('user_id', userId);
  const readAt = new Map((reads ?? []).map((r) => [r.trip_id, r.last_read_at as string]));

  const groups: ChatGroupItem[] = [];

  for (const trip of trips) {
    if (hidden.has(trip.id)) continue;
    const participantCount = getParticipantCount(trip.trip_participants);
    if (participantCount < 2) continue;

    const isOwner =
      trip.creator?.id === userId || trip.creator_id === userId;

    const since = readAt.get(trip.id) ?? '1970-01-01T00:00:00.000Z';

    const [{ count: unreadCount }, { data: lastRows }] = await Promise.all([
      supabaseAdmin
        .from('trip_messages')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', trip.id)
        .neq('user_id', userId)
        .gt('created_at', since),
      supabaseAdmin
        .from('trip_messages')
        .select('body, created_at')
        .eq('trip_id', trip.id)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const last = lastRows?.[0];

    groups.push({
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      imageUrl: trip.imageUrl,
      participantCount,
      role: isOwner ? 'owner' : 'member',
      unreadCount: unreadCount ?? 0,
      lastMessageAt: last?.created_at ?? null,
      lastMessagePreview: last?.body
        ? last.body.length > 80
          ? `${last.body.slice(0, 80)}…`
          : last.body
        : null,
    });
  }

  return groups.sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });
}

export async function listChatContactsForUser(
  userId: string,
  query?: string
): Promise<ChatContact[]> {
  const trips = await loadMembershipTrips(userId);
  const q = query?.trim().toLowerCase() ?? '';

  type Acc = ChatContact & { sortAt: number };
  const byUser = new Map<string, Acc>();

  for (const trip of trips) {
    const participants = trip.trip_participants ?? [];
    if (participants.length < 2) continue;

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, username, image')
      .in(
        'id',
        participants.map((p) => p.user_id).filter((id) => id !== userId)
      );

    for (const u of users ?? []) {
      if (u.id === userId) continue;
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
      const hay = `${name} ${u.username ?? ''}`.toLowerCase();
      if (q && !hay.includes(q)) continue;

      const prev = byUser.get(u.id);
      const sortAt = Date.now(); // membership order; refine below
      if (!prev) {
        byUser.set(u.id, {
          userId: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          username: u.username ?? null,
          image: u.image,
          sharedTripId: trip.id,
          sharedTripTitle: trip.title,
          sortAt,
        });
      }
    }
  }

  return [...byUser.values()]
    .sort((a, b) =>
      (a.firstName ?? a.username ?? '').localeCompare(b.firstName ?? b.username ?? '', 'it')
    )
    .map(({ sortAt: _s, ...c }) => c);
}

export async function searchChatMessagesForUser(
  userId: string,
  query: string,
  limit = 40
): Promise<ChatSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const trips = await loadMembershipTrips(userId);
  const tripIds = trips.map((t) => t.id);
  if (tripIds.length === 0) return [];

  const titleById = new Map(trips.map((t) => [t.id, t.title]));

  const { data, error } = await supabaseAdmin
    .from('trip_messages')
    .select(
      'id, trip_id, body, created_at, user:users(first_name, last_name, username)'
    )
    .in('trip_id', tripIds)
    .ilike('body', `%${q.replace(/[%_]/g, '')}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    const authorName =
      (user?.username ? `@${user.username}` : null) ||
      [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
      'Viaggiatore';
    return {
      messageId: row.id as string,
      tripId: row.trip_id as string,
      tripTitle: titleById.get(row.trip_id as string) ?? 'Viaggio',
      body: row.body as string,
      createdAt: row.created_at as string,
      authorName,
    };
  });
}
