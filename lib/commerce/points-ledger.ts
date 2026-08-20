import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { POINTS, pointsForAction, type PointsAction } from '@/lib/commerce/points';

export type PointsLedgerRow = {
  id: string;
  user_id: string;
  action: PointsAction | 'redeem';
  points: number;
  ref: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === '42P01';
}

/**
 * Assegna i punti di un'azione. Idempotente su (user_id, action, ref).
 */
export async function awardPoints(opts: {
  userId: string;
  action: PointsAction;
  ref: string;
  meta?: Record<string, unknown>;
  foundingCreator?: boolean;
}): Promise<number> {
  const points = pointsForAction(opts.action, { foundingCreator: opts.foundingCreator });
  if (points <= 0) return 0;
  if (!opts.userId || !opts.ref?.trim()) return 0;

  const { error } = await supabaseAdmin.from('nomad_points_ledger').insert({
    user_id: opts.userId,
    action: opts.action,
    points,
    ref: opts.ref.slice(0, 120),
    meta: { ...opts.meta, foundingCreator: Boolean(opts.foundingCreator) },
  });

  if (error && error.code !== '23505') {
    if (!isMissingTable(error)) {
      console.error('[nomad_points award]', opts.action, error.message);
    }
    return 0;
  }
  if (error?.code === '23505') return 0;
  return points;
}

export async function listPointsForUser(userId: string): Promise<PointsLedgerRow[]> {
  const { data, error } = await supabaseAdmin
    .from('nomad_points_ledger')
    .select('id, user_id, action, points, ref, meta, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    if (!isMissingTable(error)) console.error('[nomad_points list]', error.message);
    return [];
  }
  return (data ?? []) as PointsLedgerRow[];
}

export async function getPointsBalance(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('nomad_points_ledger')
    .select('points')
    .eq('user_id', userId);

  if (error) {
    if (!isMissingTable(error)) console.error('[nomad_points balance]', error.message);
    return 0;
  }
  return sumPoints((data ?? []) as Array<{ points: number }>);
}

export function sumPoints(rows: Array<{ points: number }>): number {
  return rows.reduce((sum, row) => sum + Number(row.points || 0), 0);
}

export async function redeemPerkPoints(opts: {
  userId: string;
  perkId: string;
  cost: number;
  ref: string;
  meta?: Record<string, unknown>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (opts.cost <= 0) return { ok: false, error: 'Perk non valido.' };
  const balance = await getPointsBalance(opts.userId);
  if (balance < opts.cost) return { ok: false, error: 'Punti insufficienti.' };

  const { error } = await supabaseAdmin.from('nomad_points_ledger').insert({
    user_id: opts.userId,
    action: 'redeem',
    points: -opts.cost,
    ref: opts.ref.slice(0, 120),
    meta: { perkId: opts.perkId, ...opts.meta },
  });

  if (error?.code === '23505') return { ok: false, error: 'Perk già riscattato.' };
  if (error) {
    console.error('[nomad_points redeem]', error.message);
    return { ok: false, error: 'Riscatto non riuscito.' };
  }
  return { ok: true };
}

export { POINTS };
