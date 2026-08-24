import 'server-only';

import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { OFFICIAL_EDITION_SEEDS, findItineraryTemplate } from '@/lib/itineraries/catalog';
import { datesForDuration } from '@/lib/itineraries/dates';
import {
  createPractice,
  createOrReuseDraftPractice,
  findDraftPractice,
  findPracticeForEdition,
} from '@/lib/data/practices';
import type { EditionMemberCard } from '@/lib/itineraries/bookings';
import type { EditionStatus, EditionType } from '@/lib/itineraries/types';

export type { EditionMemberCard };

export type EditionRow = {
  id: string;
  template_id: string;
  date_from: string;
  date_to: string;
  edition_type: EditionType;
  min_confirmed: number;
  status: EditionStatus;
  invite_token: string | null;
  confirmed_count?: number;
};

function missing(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || error?.code === '42703';
}

export async function listOfficialEditions(templateId?: string): Promise<EditionRow[]> {
  let query = supabaseAdmin
    .from('editions')
    .select('id, template_id, date_from, date_to, edition_type, min_confirmed, status, invite_token')
    .eq('edition_type', 'official')
    .in('status', ['open', 'formed']);
  if (templateId) query = query.eq('template_id', templateId);
  const { data, error } = await query.order('date_from', { ascending: true });

  if (error || !data?.length) {
    if (error && !missing(error)) console.error('[editions]', error.message);
    return fallbackOfficial(templateId);
  }

  const rows = data as EditionRow[];
  const withCounts = await Promise.all(
    rows.map(async (row) => {
      const { count } = await supabaseAdmin
        .from('edition_members')
        .select('*', { count: 'exact', head: true })
        .eq('edition_id', row.id)
        .eq('status', 'confirmed');
      return { ...row, confirmed_count: count ?? 0 };
    })
  );
  return withCounts;
}

function fallbackOfficial(templateId?: string): EditionRow[] {
  return OFFICIAL_EDITION_SEEDS.filter((s) => !templateId || s.template_id === templateId).map(
    (s, i) => ({
      id: `seed-${s.template_id}-${i}`,
      template_id: s.template_id,
      date_from: s.date_from,
      date_to: s.date_to,
      edition_type: 'official' as const,
      min_confirmed: s.min_confirmed,
      status: 'open' as const,
      invite_token: null,
      confirmed_count: 0,
    })
  );
}

export async function getEdition(id: string): Promise<EditionRow | null> {
  if (id.startsWith('seed-')) {
    return fallbackOfficial().find((e) => e.id === id) ?? null;
  }
  const { data, error } = await supabaseAdmin
    .from('editions')
    .select('id, template_id, date_from, date_to, edition_type, min_confirmed, status, invite_token')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const { count } = await supabaseAdmin
    .from('edition_members')
    .select('*', { count: 'exact', head: true })
    .eq('edition_id', id)
    .eq('status', 'confirmed');
  return { ...(data as EditionRow), confirmed_count: count ?? 0 };
}

export async function getEditionByToken(token: string): Promise<EditionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('editions')
    .select('id, template_id, date_from, date_to, edition_type, min_confirmed, status, invite_token')
    .eq('invite_token', token)
    .maybeSingle();
  if (error || !data) return null;
  return data as EditionRow;
}

export async function createPrivateEdition(input: {
  userId: string;
  templateId: string;
  dateFrom: string;
}) {
  const template = findItineraryTemplate(input.templateId);
  if (!template) return { error: 'Template non trovato.' };
  const dates = datesForDuration(input.dateFrom, template.duration_days);

  const existingDraft = await findDraftPractice({
    userId: input.userId,
    templateId: input.templateId,
    mode: 'friends',
  });
  if (existingDraft?.edition_id) {
    const edition = await getEdition(existingDraft.edition_id);
    if (edition) {
      const reused = await createOrReuseDraftPractice({
        userId: input.userId,
        templateId: input.templateId,
        mode: 'friends',
        dateFrom: dates.date_from,
        editionId: edition.id,
      });
      if ('error' in reused) return reused;
      if (edition.date_from !== dates.date_from || edition.date_to !== dates.date_to) {
        await supabaseAdmin
          .from('editions')
          .update({ date_from: dates.date_from, date_to: dates.date_to })
          .eq('id', edition.id);
      }
      return {
        edition: { ...edition, date_from: dates.date_from, date_to: dates.date_to },
        practice: reused.practice,
        invitePath: edition.invite_token ? `/invito/${edition.invite_token}` : null,
      };
    }
  }

  const token = randomUUID();

  const { data: edition, error } = await supabaseAdmin
    .from('editions')
    .insert({
      template_id: input.templateId,
      date_from: dates.date_from,
      date_to: dates.date_to,
      edition_type: 'private',
      min_confirmed: 2,
      status: 'open',
      invite_token: token,
      created_by: input.userId,
    })
    .select('*')
    .single();
  if (error || !edition) {
    return { error: error?.message ?? 'Impossibile creare l’edizione privata.' };
  }

  const practice = await createOrReuseDraftPractice({
    userId: input.userId,
    templateId: input.templateId,
    mode: 'friends',
    dateFrom: dates.date_from,
    editionId: edition.id as string,
  });
  if ('error' in practice) return practice;

  await supabaseAdmin.from('edition_members').insert({
    edition_id: edition.id,
    user_id: input.userId,
    status: 'interested',
  });

  return {
    edition: edition as EditionRow,
    practice: practice.practice,
    invitePath: `/invito/${token}`,
  };
}

export async function listEditionMembers(editionId: string): Promise<EditionMemberCard[]> {
  if (editionId.startsWith('seed-')) return [];
  const { data, error } = await supabaseAdmin
    .from('edition_members')
    .select('user_id, status')
    .eq('edition_id', editionId)
    .neq('status', 'left')
    .order('joined_at', { ascending: true });
  if (error || !data?.length) return [];
  const ids = data.map((r) => r.user_id as string);
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, username, image')
    .in('id', ids);
  const map = new Map((users ?? []).map((u) => [u.id as string, u]));
  return data.map((row) => {
    const u = map.get(row.user_id as string);
    return {
      userId: row.user_id as string,
      firstName: (u?.first_name as string | null) ?? null,
      lastName: (u?.last_name as string | null) ?? null,
      username: (u?.username as string | null) ?? null,
      image: (u?.image as string | null) ?? null,
      status: row.status as EditionMemberCard['status'],
    };
  });
}

export async function joinEdition(input: { userId: string; editionId: string }) {
  const edition = await getEdition(input.editionId);
  if (!edition || edition.id.startsWith('seed-')) {
    return { error: 'Edizione non disponibile. Applica la migration 032 sul database.' };
  }
  if (edition.status === 'closed' || edition.status === 'locked') {
    return { error: 'Edizione chiusa.' };
  }

  const existing = await findPracticeForEdition(input.userId, edition.id);
  if (existing) return { practice: existing };

  await supabaseAdmin.from('edition_members').upsert({
    edition_id: edition.id,
    user_id: input.userId,
    status: 'interested',
  });

  const { notifyEditionMemberJoined } = await import('@/lib/notifications/edition');
  void notifyEditionMemberJoined({ editionId: edition.id, joinerId: input.userId });

  return createPractice({
    userId: input.userId,
    templateId: edition.template_id,
    mode: edition.edition_type === 'official' ? 'group' : 'friends',
    dateFrom: String(edition.date_from).slice(0, 10),
    editionId: edition.id,
  });
}
