import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import type { ChatContact, ChatGroupItem, ChatSearchHit } from '@/lib/chat/types';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import { formatItDate } from '@/lib/itineraries/dates';

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

function mapMessage(row: Record<string, unknown>): TripMessageRow {
  const user = row.user;
  return {
    id: String(row.id),
    trip_id: String(row.edition_id ?? row.trip_id),
    user_id: String(row.user_id),
    body: String(row.body),
    created_at: String(row.created_at),
    user: Array.isArray(user)
      ? ((user[0] as TripMessageRow['user']) ?? null)
      : ((user as TripMessageRow['user']) ?? null),
  };
}

export async function isTripMember(editionId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('edition_members')
    .select('user_id')
    .eq('edition_id', editionId)
    .eq('user_id', userId)
    .neq('status', 'left')
    .maybeSingle();
  return Boolean(data);
}

export async function getTripMessages(
  editionId: string,
  since?: string
): Promise<TripMessageRow[]> {
  let query = supabaseAdmin
    .from('edition_messages')
    .select(
      'id, edition_id, user_id, body, created_at, user:users!edition_messages_user_id_fkey(id, username, first_name, last_name, image)'
    )
    .eq('edition_id', editionId)
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
  return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>));
}

const JOIN_HELLO_LINES = [
  'Ciao! Mi sono aggiunto al viaggio. Si parte? ✈️',
  'Ehilà, sono in. Ci vediamo in destinazione 🌍',
  'Ciao gruppo! Mi butto in questo viaggio 🔥',
] as const;

export function joinRequestChatBody(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h + seed.charCodeAt(i) * (i + 1)) % JOIN_HELLO_LINES.length;
  }
  return JOIN_HELLO_LINES[h] ?? JOIN_HELLO_LINES[0];
}

export async function postJoinRequestChatPing(
  editionId: string,
  requesterId: string
): Promise<void> {
  await supabaseAdmin
    .from('edition_chat_hides')
    .delete()
    .eq('edition_id', editionId);

  const { error } = await supabaseAdmin.from('edition_messages').insert({
    edition_id: editionId,
    user_id: requesterId,
    body: joinRequestChatBody(`${requesterId}:${editionId}`),
  });
  if (error && error.code !== '42P01') {
    console.error('[postJoinPing]', error.message);
  }
}

export async function postTripMessage(
  editionId: string,
  userId: string,
  body: string
): Promise<TripMessageRow> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Messaggio vuoto');

  const member = await isTripMember(editionId, userId);
  if (!member) throw new Error('Non fai parte di questo viaggio');

  await supabaseAdmin
    .from('edition_chat_hides')
    .delete()
    .eq('user_id', userId)
    .eq('edition_id', editionId);

  const { data, error } = await supabaseAdmin
    .from('edition_messages')
    .insert({ edition_id: editionId, user_id: userId, body: trimmed })
    .select(
      'id, edition_id, user_id, body, created_at, user:users!edition_messages_user_id_fkey(id, username, first_name, last_name, image)'
    )
    .single();

  if (error) throw new Error(error.message);
  return mapMessage(data as Record<string, unknown>);
}

export async function markTripChatRead(editionId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('edition_chat_reads').upsert(
    {
      user_id: userId,
      edition_id: editionId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,edition_id' }
  );
  if (error && error.code !== '42P01') {
    console.warn('[chat] mark read failed', error.message);
  }
}

export async function hideTripChat(editionId: string, userId: string): Promise<void> {
  const member = await isTripMember(editionId, userId);
  if (!member) throw new Error('Non fai parte di questo viaggio');

  const { error } = await supabaseAdmin.from('edition_chat_hides').upsert(
    {
      user_id: userId,
      edition_id: editionId,
      hidden_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,edition_id' }
  );
  if (error) {
    if (error.code === '42P01') {
      throw new Error('Esegui npm run db:edition-chat');
    }
    throw new Error(error.message);
  }
}

export async function unhideTripChat(editionId: string, userId: string): Promise<void> {
  await supabaseAdmin
    .from('edition_chat_hides')
    .delete()
    .eq('user_id', userId)
    .eq('edition_id', editionId);
}

type MembershipEdition = {
  id: string;
  template_id: string;
  date_from: string;
  date_to: string;
  memberIds: string[];
};

async function loadMembershipEditions(userId: string): Promise<MembershipEdition[]> {
  const { data: mine, error } = await supabaseAdmin
    .from('edition_members')
    .select('edition_id')
    .eq('user_id', userId)
    .neq('status', 'left');
  if (error || !mine?.length) return [];

  const ids = mine.map((r) => r.edition_id as string);
  const { data: editions } = await supabaseAdmin
    .from('editions')
    .select('id, template_id, date_from, date_to, status')
    .in('id', ids)
    .in('status', ['open', 'formed', 'locked']);
  if (!editions?.length) return [];

  const today = new Date().toISOString().slice(0, 10);
  const live = editions.filter((e) => String(e.date_to).slice(0, 10) >= today);

  const withMembers = await Promise.all(
    live.map(async (e) => {
      const { data: members } = await supabaseAdmin
        .from('edition_members')
        .select('user_id')
        .eq('edition_id', e.id)
        .neq('status', 'left');
      return {
        id: e.id as string,
        template_id: e.template_id as string,
        date_from: String(e.date_from).slice(0, 10),
        date_to: String(e.date_to).slice(0, 10),
        memberIds: (members ?? []).map((m) => m.user_id as string),
      };
    })
  );
  return withMembers;
}

function editionTitle(ed: MembershipEdition) {
  const tpl = findItineraryTemplate(ed.template_id);
  const dest = tpl?.destination_name ?? ed.template_id;
  return `${dest} · ${formatItDate(ed.date_from)}`;
}

export async function listChatGroupsForUser(userId: string): Promise<ChatGroupItem[]> {
  const editions = await loadMembershipEditions(userId);

  const { data: hides } = await supabaseAdmin
    .from('edition_chat_hides')
    .select('edition_id')
    .eq('user_id', userId);
  const hidden = new Set((hides ?? []).map((h) => h.edition_id));

  const { data: reads } = await supabaseAdmin
    .from('edition_chat_reads')
    .select('edition_id, last_read_at')
    .eq('user_id', userId);
  const readAt = new Map((reads ?? []).map((r) => [r.edition_id, r.last_read_at as string]));

  const groups: ChatGroupItem[] = [];

  for (const ed of editions) {
    if (hidden.has(ed.id)) continue;
    const participantCount = ed.memberIds.length;
    const since = readAt.get(ed.id) ?? '1970-01-01T00:00:00.000Z';
    const tpl = findItineraryTemplate(ed.template_id);

    const [{ count: unreadCount }, { data: lastRows }] = await Promise.all([
      supabaseAdmin
        .from('edition_messages')
        .select('*', { count: 'exact', head: true })
        .eq('edition_id', ed.id)
        .neq('user_id', userId)
        .gt('created_at', since),
      supabaseAdmin
        .from('edition_messages')
        .select('body, created_at')
        .eq('edition_id', ed.id)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const last = lastRows?.[0];
    if (participantCount < 2 && !last) continue;

    groups.push({
      id: ed.id,
      title: editionTitle(ed),
      destination: tpl?.destination_name ?? ed.template_id,
      imageUrl: coverForDestination(tpl?.destination_slug ?? ed.template_id),
      participantCount,
      role: 'member',
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
  const editions = await loadMembershipEditions(userId);
  const q = query?.trim().toLowerCase() ?? '';
  const byUser = new Map<string, ChatContact>();

  for (const ed of editions) {
    if (ed.memberIds.length < 2) continue;
    const others = ed.memberIds.filter((id) => id !== userId);
    if (!others.length) continue;
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, username, image')
      .in('id', others);

    for (const u of users ?? []) {
      if (u.id === userId) continue;
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
      const hay = `${name} ${u.username ?? ''}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      if (byUser.has(u.id as string)) continue;
      byUser.set(u.id as string, {
        userId: u.id as string,
        firstName: u.first_name as string | null,
        lastName: u.last_name as string | null,
        username: (u.username as string | null) ?? null,
        image: u.image as string | null,
        sharedTripId: ed.id,
        sharedTripTitle: editionTitle(ed),
      });
    }
  }

  return [...byUser.values()].sort((a, b) =>
    (a.firstName ?? a.username ?? '').localeCompare(b.firstName ?? b.username ?? '', 'it')
  );
}

export async function searchChatMessagesForUser(
  userId: string,
  query: string,
  limit = 40
): Promise<ChatSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const editions = await loadMembershipEditions(userId);
  const editionIds = editions.map((e) => e.id);
  if (editionIds.length === 0) return [];

  const titleById = new Map(editions.map((e) => [e.id, editionTitle(e)]));

  const { data, error } = await supabaseAdmin
    .from('edition_messages')
    .select(
      'id, edition_id, body, created_at, user:users!edition_messages_user_id_fkey(first_name, last_name, username)'
    )
    .in('edition_id', editionIds)
    .ilike('body', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => {
    const u = Array.isArray(row.user) ? row.user[0] : row.user;
    const author =
      [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() ||
      (u?.username ? `@${u.username}` : 'Viaggiatore');
    return {
      messageId: row.id as string,
      tripId: row.edition_id as string,
      tripTitle: titleById.get(row.edition_id as string) ?? 'Viaggio',
      body: String(row.body ?? ''),
      createdAt: String(row.created_at),
      authorName: author,
    };
  });
}
