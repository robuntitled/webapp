import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPractice } from '@/lib/data/practices';
import { getEdition } from '@/lib/data/editions';
import { evaluatePracticeDelete } from '@/lib/itineraries/practice-delete-rules';
import { parseFlightStatus } from '@/lib/itineraries/bookings';
import { listPracticeFlightBookings } from '@/lib/itineraries/practice-flights';
import { DASHBOARD_VIAGGI_COPY } from '@/lib/itineraries/dashboard-viaggi-copy';

async function countOtherActiveMembers(editionId: string, userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('edition_members')
    .select('user_id, status, joined_at')
    .eq('edition_id', editionId)
    .in('status', ['interested', 'confirmed']);
  return (data ?? []).filter((r) => r.user_id !== userId).length;
}

async function oldestOtherMember(editionId: string, userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('edition_members')
    .select('user_id, status, joined_at')
    .eq('edition_id', editionId)
    .in('status', ['interested', 'confirmed'])
    .order('joined_at', { ascending: true });
  const other = (data ?? []).find((r) => r.user_id !== userId);
  return (other?.user_id as string | undefined) ?? null;
}

/**
 * Re-read flight statuses and conservatively decide if a failed booking
 * has no charge. We do not call payment providers here — if amountEur > 0
 * or status is pending/confirmed, treat as charged.
 */
export function verifyNoChargeOnPractice(practice: Awaited<ReturnType<typeof getPractice>>): boolean {
  if (!practice) return false;
  const flights = listPracticeFlightBookings(practice);
  for (const fb of flights) {
    const kind = parseFlightStatus(fb.status);
    if (kind === 'pending' || kind === 'confirmed' || kind === 'cancelled') return false;
    if (kind === 'failed') {
      if (fb.amountEur != null && fb.amountEur > 0) return false;
      if (fb.transactionId) return false;
    }
  }
  return true;
}

export async function transferEditionCreator(input: {
  editionId: string;
  fromUserId: string;
}): Promise<{ ok: true; newCreatorId: string } | { error: string }> {
  const next = await oldestOtherMember(input.editionId, input.fromUserId);
  if (!next) return { error: 'Nessun partecipante a cui passare il ruolo di creatore.' };

  const { error } = await supabaseAdmin
    .from('editions')
    .update({ created_by: next })
    .eq('id', input.editionId)
    .eq('created_by', input.fromUserId);
  if (error) {
    return { error: 'Impossibile trasferire il ruolo di creatore.' };
  }

  await supabaseAdmin
    .from('edition_members')
    .update({ status: 'left' })
    .eq('edition_id', input.editionId)
    .eq('user_id', input.fromUserId);

  return { ok: true, newCreatorId: next };
}

/** Detach practice from group edition when dates change (Kr #5). */
export async function detachPracticeFromEditionOnDateChange(input: {
  practiceId: string;
  userId: string;
}): Promise<{ detached: boolean }> {
  const practice = await getPractice(input.practiceId, input.userId);
  if (!practice?.edition_id) return { detached: false };
  const edition = await getEdition(practice.edition_id);
  if (!edition) return { detached: false };
  if (edition.edition_type !== 'official' && edition.edition_type !== 'private') {
    return { detached: false };
  }

  const { error } = await supabaseAdmin
    .from('practices')
    .update({ edition_id: null })
    .eq('id', input.practiceId)
    .eq('user_id', input.userId);
  if (error) return { detached: false };

  await supabaseAdmin
    .from('edition_members')
    .update({ status: 'left' })
    .eq('edition_id', practice.edition_id)
    .eq('user_id', input.userId);

  return { detached: true };
}

export type DeletePracticeResult =
  | { ok: true; mode: 'hard_deleted' }
  | { ok: true; mode: 'transferred_and_left'; newCreatorId: string }
  | { ok: true; mode: 'left' }
  | { error: string };

/**
 * Delete or leave a trip according to Kr rules. Never deletes the user account.
 * Never promises refunds.
 */
export async function deleteOrLeavePractice(input: {
  practiceId: string;
  userId: string;
}): Promise<DeletePracticeResult> {
  const practice = await getPractice(input.practiceId, input.userId);
  if (!practice) return { error: 'Viaggio non trovato.' };

  const edition = practice.edition_id ? await getEdition(practice.edition_id) : null;
  const isCreator = Boolean(edition?.created_by && edition.created_by === input.userId);
  const otherCount = practice.edition_id
    ? await countOtherActiveMembers(practice.edition_id, input.userId)
    : 0;

  // Server re-reads charge signal before delete.
  const chargeVerifiedNone = verifyNoChargeOnPractice(practice);
  const eligibility = evaluatePracticeDelete({
    practice,
    isCreator: isCreator || !practice.edition_id,
    otherActiveMemberCount: otherCount,
    chargeVerifiedNone,
  });

  if (eligibility.canHardDelete) {
    // Hard delete draft practice (+ leave edition membership if any).
    if (practice.edition_id) {
      await supabaseAdmin
        .from('edition_members')
        .delete()
        .eq('edition_id', practice.edition_id)
        .eq('user_id', input.userId);
      // If solo creator of private edition with no others, remove empty edition shell.
      if (isCreator && otherCount === 0) {
        await supabaseAdmin.from('editions').delete().eq('id', practice.edition_id);
      }
    }
    const { error } = await supabaseAdmin
      .from('practices')
      .delete()
      .eq('id', input.practiceId)
      .eq('user_id', input.userId);
    if (error) return { error: 'Impossibile eliminare il viaggio.' };
    return { ok: true, mode: 'hard_deleted' };
  }

  if (eligibility.shouldTransferAndLeave && practice.edition_id && isCreator) {
    const transferred = await transferEditionCreator({
      editionId: practice.edition_id,
      fromUserId: input.userId,
    });
    if ('error' in transferred) return transferred;

    // Soft-cancel own practice row (keep history; account untouched).
    await supabaseAdmin
      .from('practices')
      .update({ status: 'cancelled', edition_id: null })
      .eq('id', input.practiceId)
      .eq('user_id', input.userId);

    return {
      ok: true,
      mode: 'transferred_and_left',
      newCreatorId: transferred.newCreatorId,
    };
  }

  if (!isCreator && practice.edition_id) {
    await supabaseAdmin
      .from('edition_members')
      .update({ status: 'left' })
      .eq('edition_id', practice.edition_id)
      .eq('user_id', input.userId);
    await supabaseAdmin
      .from('practices')
      .update({ status: 'cancelled', edition_id: null })
      .eq('id', input.practiceId)
      .eq('user_id', input.userId);
    return { ok: true, mode: 'left' };
  }

  return {
    error: eligibility.message ?? DASHBOARD_VIAGGI_COPY.toast.deleteBlockedPaid,
  };
}
