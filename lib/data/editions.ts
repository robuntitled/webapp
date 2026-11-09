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
import { canReusePrivateEditionForUser } from '@/lib/itineraries/private-edition';
import type { EditionStatus, EditionType } from '@/lib/itineraries/types';
import { getUserRatingSummaries } from '@/lib/data/user-ratings';
import {
  EDITION_COMING_SOON_JOIN_ERROR,
  isEditionComingSoon,
} from '@/lib/itineraries/edition-joinability';
import { friendlyDbErrorIt, isMissingSchemaError } from '@/lib/data/db-errors';

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
  created_by?: string | null;
  /** Nome opzionale; se assente → destinazione template. */
  title?: string | null;
  confirmed_count?: number;
  interested_count?: number;
  /** A4: senza tour operator → In arrivo (solo codice). */
  coming_soon?: boolean;
};

export type EditionHost = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
  ratingAvg: number | null;
  ratingCount: number;
};

function missing(error: { code?: string; message?: string } | null) {
  return isMissingSchemaError(error);
}

/** Columns that exist without migration 041 (editions.title). */
const EDITION_SELECT_BASE =
  'id, template_id, date_from, date_to, edition_type, min_confirmed, status, invite_token, created_by';

/** Solo partenze con inizio oggi o futuro (ISO yyyy-mm-dd). */
function isUpcomingEdition(dateFrom: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return dateFrom.slice(0, 10) >= `${y}-${m}-${d}`;
}

export async function listJoinableEditions(templateId?: string): Promise<EditionRow[]> {
  // Solo partenze pubbliche (official). Le private sono invite-only (/invito/[token]).
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

  const rows = (data as EditionRow[]).filter((row) => isUpcomingEdition(String(row.date_from)));
  if (!rows.length) return fallbackOfficial(templateId);

  const withCounts = await Promise.all(
    rows.map(async (row) => {
      const [{ count: confirmed }, { count: interested }] = await Promise.all([
        supabaseAdmin
          .from('edition_members')
          .select('*', { count: 'exact', head: true })
          .eq('edition_id', row.id)
          .eq('status', 'confirmed'),
        supabaseAdmin
          .from('edition_members')
          .select('*', { count: 'exact', head: true })
          .eq('edition_id', row.id)
          .eq('status', 'interested'),
      ]);
      const comingSoon = isEditionComingSoon({
        template_id: row.template_id,
        date_from: String(row.date_from),
        edition_type: row.edition_type,
      });
      return {
        ...row,
        confirmed_count: confirmed ?? 0,
        interested_count: interested ?? 0,
        coming_soon: comingSoon,
      };
    })
  );
  return withCounts;
}

export async function listOfficialEditions(templateId?: string): Promise<EditionRow[]> {
  const all = await listJoinableEditions(templateId);
  const official = all.filter((e) => e.edition_type === 'official');
  return official.length ? official : fallbackOfficial(templateId);
}

function fallbackOfficial(templateId?: string): EditionRow[] {
  return OFFICIAL_EDITION_SEEDS.filter(
    (s) =>
      (!templateId || s.template_id === templateId) && isUpcomingEdition(s.date_from)
  ).map((s, i) => ({
    id: `seed-${s.template_id}-${i}`,
    template_id: s.template_id,
    date_from: s.date_from,
    date_to: s.date_to,
    edition_type: 'official' as const,
    min_confirmed: s.min_confirmed,
    status: 'open' as const,
    invite_token: null,
    confirmed_count: 0,
    coming_soon: isEditionComingSoon({
      template_id: s.template_id,
      date_from: s.date_from,
      edition_type: 'official',
      tourOperatorId: s.tourOperatorId,
    }),
  }));
}

export async function getEdition(id: string): Promise<EditionRow | null> {
  if (id.startsWith('seed-')) {
    return fallbackOfficial().find((e) => e.id === id) ?? null;
  }
  // Never select `title` here: migration 041 may be absent; PostgREST returns PGRST204.
  const { data, error } = await supabaseAdmin
    .from('editions')
    .select(EDITION_SELECT_BASE)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn('[editions] getEdition', error.code, error.message);
    return null;
  }
  if (!data) return null;
  const [{ count: confirmed }, { count: interested }] = await Promise.all([
    supabaseAdmin
      .from('edition_members')
      .select('*', { count: 'exact', head: true })
      .eq('edition_id', id)
      .eq('status', 'confirmed'),
    supabaseAdmin
      .from('edition_members')
      .select('*', { count: 'exact', head: true })
      .eq('edition_id', id)
      .eq('status', 'interested'),
  ]);
  const row = data as EditionRow;
  return {
    ...row,
    confirmed_count: confirmed ?? 0,
    interested_count: interested ?? 0,
    coming_soon: isEditionComingSoon({
      template_id: row.template_id,
      date_from: String(row.date_from),
      edition_type: row.edition_type,
    }),
  };
}

export async function getEditionHost(editionId: string): Promise<EditionHost | null> {
  if (editionId.startsWith('seed-')) return null;
  const { data: edition } = await supabaseAdmin
    .from('editions')
    .select('created_by, edition_type')
    .eq('id', editionId)
    .maybeSingle();
  const hostId = edition?.created_by as string | null | undefined;
  if (!hostId || edition?.edition_type === 'official') return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, username, image')
    .eq('id', hostId)
    .maybeSingle();
  if (!user) return null;

  const ratings = await getUserRatingSummaries([hostId]);
  const summary = ratings.get(hostId);

  return {
    userId: hostId,
    firstName: (user.first_name as string | null) ?? null,
    lastName: (user.last_name as string | null) ?? null,
    username: (user.username as string | null) ?? null,
    image: (user.image as string | null) ?? null,
    ratingAvg: summary?.avg ?? null,
    ratingCount: summary?.count ?? 0,
  };
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
  dateTo?: string;
  /** friends = invito; group = partenza a cui altri possono unirsi. */
  mode?: 'friends' | 'group';
  /** Nome opzionale del viaggio (default destinazione). */
  title?: string | null;
}) {
  const travelMode = input.mode === 'group' ? 'group' : 'friends';
  const template = findItineraryTemplate(input.templateId);
  if (!template) return { error: 'Template non trovato.' };
  const dates = input.dateTo
    ? { date_from: input.dateFrom.slice(0, 10), date_to: input.dateTo.slice(0, 10) }
    : datesForDuration(input.dateFrom, template.duration_days);
  // Ignore optional title until migration 041 is applied in the target DB.
  // Writing `title` triggers PostgREST PGRST204 ("schema cache") and was shown raw in UI.
  void input.title;

  const existingDraft = await findDraftPractice({
    userId: input.userId,
    templateId: input.templateId,
    mode: travelMode,
  });

  // Riuso SOLO della propria edition privata (mai match su dest/date di terzi).
  if (existingDraft?.edition_id) {
    const candidate = await getEdition(existingDraft.edition_id);
    if (canReusePrivateEditionForUser(candidate, input.userId) && candidate) {
      const reused = await createOrReuseDraftPractice({
        userId: input.userId,
        templateId: input.templateId,
        mode: travelMode,
        dateFrom: dates.date_from,
        dateTo: dates.date_to,
        editionId: candidate.id,
      });
      if ('error' in reused) {
        return {
          error: friendlyDbErrorIt(
            { message: reused.error },
            'Impossibile aggiornare il viaggio. Riprova.'
          ),
        };
      }
      const patch: Record<string, string> = {};
      if (candidate.date_from !== dates.date_from || candidate.date_to !== dates.date_to) {
        patch.date_from = dates.date_from;
        patch.date_to = dates.date_to;
      }
      if (Object.keys(patch).length) {
        const { error: patchErr } = await supabaseAdmin
          .from('editions')
          .update(patch)
          .eq('id', candidate.id)
          .eq('created_by', input.userId);
        if (patchErr && !missing(patchErr)) {
          console.warn('[editions] patch private', patchErr.code, patchErr.message);
        }
      }
      await supabaseAdmin.from('edition_members').upsert(
        {
          edition_id: candidate.id,
          user_id: input.userId,
          status: 'interested',
        },
        { onConflict: 'edition_id,user_id' }
      );
      return {
        edition: {
          ...candidate,
          date_from: dates.date_from,
          date_to: dates.date_to,
        },
        practice: reused.practice,
        invitePath: candidate.invite_token ? `/invito/${candidate.invite_token}` : null,
      };
    }
  }

  const token = randomUUID();
  const baseInsert = {
    template_id: input.templateId,
    date_from: dates.date_from,
    date_to: dates.date_to,
    edition_type: 'private' as const,
    // Soglia voli (non = persone nel gruppo).
    min_confirmed: 2,
    status: 'open' as const,
    invite_token: token,
    created_by: input.userId,
  };

  let edition: EditionRow | null = null;
  {
    // Never insert `title` — column may be absent (migration 041 not applied).
    const first = await supabaseAdmin
      .from('editions')
      .insert(baseInsert)
      .select(EDITION_SELECT_BASE)
      .single();
    if (first.data) {
      edition = first.data as EditionRow;
    } else {
      console.error('[editions] createPrivateEdition insert', first.error?.code, first.error?.message);
      return {
        error: friendlyDbErrorIt(
          first.error,
          'Impossibile creare il viaggio. Riprova tra poco.'
        ),
      };
    }
  }

  // Se la bozza è agganciata a un’edition altrui (join/invito), NON sovrascriverla:
  // crea una pratica nuova per la propria edition privata.
  const draftPointsElsewhere = Boolean(
    existingDraft?.edition_id && existingDraft.edition_id !== edition.id
  );
  const practice = draftPointsElsewhere
    ? await createPractice({
        userId: input.userId,
        templateId: input.templateId,
        mode: travelMode,
        dateFrom: dates.date_from,
        dateTo: dates.date_to,
        editionId: edition.id,
      })
    : await createOrReuseDraftPractice({
        userId: input.userId,
        templateId: input.templateId,
        mode: travelMode,
        dateFrom: dates.date_from,
        dateTo: dates.date_to,
        editionId: edition.id,
      });
  if ('error' in practice) return practice;

  // Unico membro iniziale: il creatore
  await supabaseAdmin.from('edition_members').upsert(
    {
      edition_id: edition.id,
      user_id: input.userId,
      status: 'interested',
    },
    { onConflict: 'edition_id,user_id' }
  );

  return {
    edition,
    practice: practice.practice,
    invitePath: `/invito/${token}`,
  };
}

/** Aggiorna il nome del viaggio (richiede migration 041). */
export async function updateEditionTitle(input: {
  editionId: string;
  userId: string;
  title: string | null;
}): Promise<{ ok: true; title: string | null } | { error: string }> {
  const edition = await getEdition(input.editionId);
  if (!edition) return { error: 'Viaggio non trovato.' };
  if (edition.created_by && edition.created_by !== input.userId) {
    return { error: 'Solo il creatore può rinominare il viaggio.' };
  }
  const template = findItineraryTemplate(edition.template_id);
  const trimmed = input.title?.trim() ?? '';
  const next =
    !trimmed || trimmed === (template?.destination_name ?? '')
      ? null
      : trimmed.slice(0, 80);

  const { error } = await supabaseAdmin
    .from('editions')
    .update({ title: next })
    .eq('id', input.editionId);
  if (error) {
    console.warn('[editions] updateEditionTitle', error.code, error.message);
    if (missing(error)) {
      return {
        error:
          'Rinomina non disponibile al momento. Il viaggio resta salvato con il nome della destinazione.',
      };
    }
    return {
      error: friendlyDbErrorIt(error, 'Impossibile rinominare il viaggio. Riprova.'),
    };
  }
  return { ok: true, title: next };
}

function normalizeMemberUserId(id: string): string {
  return String(id).trim().toLowerCase();
}

export async function listEditionMembers(
  editionId: string,
  options?: { withRatings?: boolean }
): Promise<EditionMemberCard[]> {
  if (editionId.startsWith('seed-')) return [];
  const { data, error } = await supabaseAdmin
    .from('edition_members')
    .select('user_id, status')
    .eq('edition_id', editionId)
    .in('status', ['interested', 'confirmed'])
    .order('joined_at', { ascending: true });
  if (error || !data?.length) return [];

  // Dedup aggressivo per user_id normalizzato (case/spazi); preferisci confirmed.
  const byUser = new Map<string, (typeof data)[number]>();
  for (const row of data) {
    const key = normalizeMemberUserId(row.user_id as string);
    if (!key) continue;
    const prev = byUser.get(key);
    if (!prev || (row.status === 'confirmed' && prev.status !== 'confirmed')) {
      byUser.set(key, row);
    }
  }
  const uniqueRows = [...byUser.values()];
  const ids = uniqueRows.map((r) => r.user_id as string);
  const [{ data: users }, { data: practiceRows }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, username, image')
      .in('id', ids),
    supabaseAdmin
      .from('practices')
      .select('user_id')
      .eq('edition_id', editionId)
      .neq('status', 'cancelled'),
  ]);
  // Mappa per id normalizzato: evita doppi conteggi se casing differisce
  const map = new Map(
    (users ?? []).map((u) => [normalizeMemberUserId(u.id as string), u])
  );
  const practiceUserIds = new Set(
    (practiceRows ?? [])
      .map((p) => normalizeMemberUserId(p.user_id as string))
      .filter(Boolean)
  );
  const ratings = options?.withRatings ? await getUserRatingSummaries(ids) : null;

  // Solo membri con riga users reale; se esistono practices, escludi ghost senza pratica.
  const out: EditionMemberCard[] = [];
  for (const row of uniqueRows) {
    const key = normalizeMemberUserId(row.user_id as string);
    const u = map.get(key);
    if (!u) continue;
    if (practiceUserIds.size > 0 && !practiceUserIds.has(key)) continue;
    const rating = ratings?.get(row.user_id as string) ?? ratings?.get(u.id as string);
    out.push({
      userId: u.id as string,
      firstName: (u.first_name as string | null) ?? null,
      lastName: (u.last_name as string | null) ?? null,
      username: (u.username as string | null) ?? null,
      image: (u.image as string | null) ?? null,
      status: row.status as EditionMemberCard['status'],
      ratingAvg: rating?.avg ?? null,
      ratingCount: rating?.count ?? 0,
    });
  }
  return out;
}

export async function joinEdition(input: { userId: string; editionId: string }) {
  const edition = await getEdition(input.editionId);
  if (!edition || edition.id.startsWith('seed-')) {
    return { error: 'Questa partenza non è ancora disponibile.' };
  }
  if (edition.status === 'closed' || edition.status === 'locked') {
    return { error: 'Edizione chiusa.' };
  }
  if (
    isEditionComingSoon({
      template_id: edition.template_id,
      date_from: String(edition.date_from),
      edition_type: edition.edition_type,
    })
  ) {
    return { error: EDITION_COMING_SOON_JOIN_ERROR };
  }

  const existing = await findPracticeForEdition(input.userId, edition.id);
  if (existing) return { practice: existing };

  // Official: Partecipa da /partenze. Private: solo dopo risoluzione invito (/invito).
  // (La pagina /partenze/[id] non espone più le private ai non-membri.)

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
