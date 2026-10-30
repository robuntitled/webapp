import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { listEditionMembers } from '@/lib/data/editions';
import { listChatGroupsForUser } from '@/lib/data/trip-chat';
import { formatItDate } from '@/lib/itineraries/dates';

export const dynamic = 'force-dynamic';

const PRACTICE_ID = '55a06d56-c4a8-44f5-97de-1c4e74e913df';

/**
 * Read-only diagnostic for preview QA. Disabled on production.
 * No writes. Remove after diagnosis.
 */
export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const practiceRes = await supabaseAdmin
    .from('practices')
    .select('*')
    .eq('id', PRACTICE_ID)
    .maybeSingle();

  const practice = practiceRes.data;
  const editionId = practice?.edition_id as string | null | undefined;

  const editionRes = editionId
    ? await supabaseAdmin
        .from('editions')
        .select('*')
        .eq('id', editionId)
        .maybeSingle()
    : { data: null, error: null };

  // title column may be missing — try without if needed
  let edition = editionRes.data as Record<string, unknown> | null;
  let editionSelectError = editionRes.error?.message ?? null;
  if (editionRes.error && /title|42703/i.test(editionRes.error.message)) {
    const fb = await supabaseAdmin
      .from('editions')
      .select(
        'id, template_id, date_from, date_to, edition_type, min_confirmed, status, invite_token, created_by'
      )
      .eq('id', editionId!)
      .maybeSingle();
    edition = fb.data as Record<string, unknown> | null;
    editionSelectError = fb.error?.message ?? 'title missing, used fallback';
  }

  const rawMembers = editionId
    ? await supabaseAdmin
        .from('edition_members')
        .select('user_id, status, joined_at')
        .eq('edition_id', editionId)
        .order('joined_at', { ascending: true })
    : { data: [], error: null };

  const memberUserIds = [...new Set((rawMembers.data ?? []).map((m) => m.user_id as string))];
  const usersRes = memberUserIds.length
    ? await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, username')
        .in('id', memberUserIds)
    : { data: [], error: null };

  const practicesOnEdition = editionId
    ? await supabaseAdmin
        .from('practices')
        .select('id, user_id, status, mode, date_from, date_to')
        .eq('edition_id', editionId)
    : { data: [], error: null };

  const listedMembers = editionId ? await listEditionMembers(editionId) : [];

  const ownerId = (practice?.user_id as string | undefined) ?? null;

  // Chat membership diagnostics for practice owner
  let chatDiag: Record<string, unknown> | null = null;
  if (ownerId) {
    const [{ data: memRows }, { data: practiceRows }, { data: hides }, { data: notifs }] =
      await Promise.all([
        supabaseAdmin
          .from('edition_members')
          .select('edition_id, status')
          .eq('user_id', ownerId),
        supabaseAdmin
          .from('practices')
          .select('id, edition_id, status, date_from, date_to, template_id')
          .eq('user_id', ownerId)
          .neq('status', 'cancelled'),
        supabaseAdmin
          .from('edition_chat_hides')
          .select('edition_id, hidden_at')
          .eq('user_id', ownerId),
        supabaseAdmin
          .from('user_notifications')
          .select('id, type, title, body, link, metadata, created_at')
          .eq('user_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(40),
      ]);

    const editionIds = [
      ...new Set(
        [
          ...(memRows ?? []).map((r) => r.edition_id as string),
          ...(practiceRows ?? [])
            .map((r) => r.edition_id as string | null)
            .filter((x): x is string => Boolean(x)),
        ].filter(Boolean)
      ),
    ];

    const editionsFull = editionIds.length
      ? await supabaseAdmin
          .from('editions')
          .select('id, template_id, date_from, date_to, status, edition_type, created_by, title')
          .in('id', editionIds)
      : { data: null, error: { message: 'no ids' } };

    let editionsData = editionsFull.data;
    let editionsErr =
      'error' in editionsFull && editionsFull.error
        ? (editionsFull.error as { message?: string }).message
        : null;
    if (editionsErr && /title|42703/i.test(editionsErr)) {
      const fb = await supabaseAdmin
        .from('editions')
        .select('id, template_id, date_from, date_to, status, edition_type, created_by')
        .in('id', editionIds);
      editionsData = fb.data;
      editionsErr = fb.error?.message ?? 'title missing fallback';
    }

    const groups = await listChatGroupsForUser(ownerId);

    chatDiag = {
      ownerId,
      membershipRows: memRows ?? [],
      practiceRows: practiceRows ?? [],
      hides: hides ?? [],
      notificationsSample: (notifs ?? []).map((n) => ({
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        metadata: n.metadata,
        created_at: n.created_at,
      })),
      editionsLoaded: (editionsData ?? []).map((e) => ({
        id: e.id,
        template_id: e.template_id,
        date_from: e.date_from,
        date_to: e.date_to,
        date_from_it: formatItDate(String(e.date_from).slice(0, 10)),
        status: e.status,
        edition_type: e.edition_type,
        created_by: (e as { created_by?: string }).created_by ?? null,
        title: (e as { title?: string | null }).title ?? null,
      })),
      editionsQueryError: editionsErr,
      chatGroupsReturned: groups.map((g) => ({
        id: g.id,
        title: g.title,
        participantCount: g.participantCount,
        chatUnlocked: g.chatUnlocked,
      })),
    };
  }

  const createdBy = edition?.created_by as string | null | undefined;
  const canRenameBreakdown = {
    hasEditionId: Boolean(editionId),
    editionFound: Boolean(edition),
    edition_type: edition?.edition_type ?? null,
    created_by: createdBy ?? null,
    practice_user_id: ownerId,
    practice_mode: practice?.mode ?? null,
    created_by_equals_practice_user: createdBy != null && createdBy === ownerId,
    branch_created_by_match: createdBy != null && createdBy === ownerId,
    branch_private_no_created_by:
      edition?.edition_type === 'private' && !createdBy,
    branch_no_edition_friends: !edition && practice?.mode === 'friends',
    // Note: page uses session.user.id; if session id !== practice.user_id, getPractice 404s
    wouldPassIfSessionIsPracticeOwner:
      Boolean(editionId) &&
      ((createdBy != null && createdBy === ownerId) ||
        (edition?.edition_type === 'private' && !createdBy) ||
        (!edition && practice?.mode === 'friends')),
  };

  return NextResponse.json({
    commitHint: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    practice: practice
      ? {
          id: practice.id,
          user_id: practice.user_id,
          edition_id: practice.edition_id,
          mode: practice.mode,
          status: practice.status,
          template_id: practice.template_id,
          date_from: practice.date_from,
          date_to: practice.date_to,
        }
      : null,
    practiceError: practiceRes.error?.message ?? null,
    edition,
    editionSelectError,
    rawMembers: rawMembers.data ?? [],
    rawMembersError: rawMembers.error?.message ?? null,
    users: usersRes.data ?? [],
    practicesOnEdition: practicesOnEdition.data ?? [],
    listEditionMembersResult: listedMembers,
    listEditionMembersCount: listedMembers.length,
    canRenameBreakdown,
    chatDiag,
  });
}
