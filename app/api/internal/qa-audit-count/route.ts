import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** Preview-only read-only count for audit SQL. Remove after deploy check. */
export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { data: practices, error } = await supabaseAdmin
    .from('practices')
    .select('id, user_id, edition_id, mode, status, template_id, date_from')
    .not('edition_id', 'is', null)
    .neq('status', 'cancelled')
    .in('mode', ['friends', 'group']);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const editionIds = [
    ...new Set((practices ?? []).map((p) => p.edition_id as string).filter(Boolean)),
  ];
  const { data: editions, error: e2 } = await supabaseAdmin
    .from('editions')
    .select('id, edition_type, created_by')
    .in('id', editionIds)
    .eq('edition_type', 'private');

  if (e2) {
    return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  const byId = new Map((editions ?? []).map((e) => [e.id as string, e]));
  const foreign = (practices ?? []).filter((p) => {
    const ed = byId.get(p.edition_id as string);
    if (!ed) return false;
    if (!ed.created_by) return false;
    return ed.created_by !== p.user_id;
  });

  return NextResponse.json({
    commitHint: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    foreignPrivatePracticeCount: foreign.length,
    sample: foreign.slice(0, 20).map((p) => ({
      practice_id: p.id,
      practice_owner_id: p.user_id,
      edition_id: p.edition_id,
      edition_creator_id: byId.get(p.edition_id as string)?.created_by ?? null,
      template_id: p.template_id,
      date_from: p.date_from,
      mode: p.mode,
    })),
  });
}
