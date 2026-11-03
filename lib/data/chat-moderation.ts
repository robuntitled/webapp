import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type ChatReportTarget = 'message' | 'profile' | 'group';

function missingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message ?? '');
}

export async function createChatReport(input: {
  reporterId: string;
  target: ChatReportTarget;
  reason: string;
  editionId?: string | null;
  messageId?: string | null;
  reportedUserId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string; needsMigration?: boolean }> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: 'Scrivi un motivo breve (almeno 3 caratteri).' };
  }
  if (reason.length > 1000) {
    return { ok: false, error: 'Motivo troppo lungo (max 1000 caratteri).' };
  }

  const { data, error } = await supabaseAdmin
    .from('chat_reports')
    .insert({
      reporter_id: input.reporterId,
      edition_id: input.editionId ?? null,
      message_id: input.messageId ?? null,
      reported_user_id: input.reportedUserId ?? null,
      target: input.target,
      reason,
      status: 'received',
    })
    .select('id')
    .single();

  if (error || !data) {
    if (missingRelation(error)) {
      return {
        ok: false,
        error: 'Segnalazioni non ancora attive (migrazione 044 da applicare).',
        needsMigration: true,
      };
    }
    return { ok: false, error: error?.message ?? 'Segnalazione non salvata.' };
  }
  return { ok: true, id: String(data.id) };
}

export async function blockUser(input: {
  blockerId: string;
  blockedId: string;
}): Promise<{ ok: true } | { ok: false; error: string; needsMigration?: boolean }> {
  if (input.blockerId === input.blockedId) {
    return { ok: false, error: 'Non puoi bloccare te stesso.' };
  }

  const { error } = await supabaseAdmin.from('user_blocks').upsert(
    {
      blocker_id: input.blockerId,
      blocked_id: input.blockedId,
    },
    { onConflict: 'blocker_id,blocked_id' }
  );

  if (error) {
    if (missingRelation(error)) {
      return {
        ok: false,
        error: 'Blocco non ancora attivo (migrazione 044 da applicare).',
        needsMigration: true,
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function unblockUser(input: {
  blockerId: string;
  blockedId: string;
}): Promise<{ ok: true } | { ok: false; error: string; needsMigration?: boolean }> {
  const { error } = await supabaseAdmin
    .from('user_blocks')
    .delete()
    .eq('blocker_id', input.blockerId)
    .eq('blocked_id', input.blockedId);

  if (error) {
    if (missingRelation(error)) {
      return {
        ok: false,
        error: 'Blocco non ancora attivo (migrazione 044 da applicare).',
        needsMigration: true,
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Id utenti bloccati dal viewer (vuoto se tabella assente). */
export async function listBlockedUserIds(blockerId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  if (error) {
    if (missingRelation(error)) return [];
    console.error('[chat-moderation] listBlockedUserIds', error.message);
    return [];
  }
  return (data ?? []).map((r) => String(r.blocked_id));
}

export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  if (error) {
    if (missingRelation(error)) return false;
    return false;
  }
  return Boolean(data);
}
