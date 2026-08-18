import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { POINTS, type PointsAction } from '@/lib/commerce/points';

export type PointsLedgerRow = {
  id: string;
  user_id: string;
  action: PointsAction | 'redeem';
  points: number;
  ref: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Assegna i punti di un'azione. Idempotente su (user_id, action, ref):
 * ri-eseguire con lo stesso ref non accredita due volte.
 */
export async function awardPoints(opts: {
  userId: string;
  action: PointsAction;
  ref: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const def = POINTS[opts.action];
  if (!def || def.points <= 0) return;
  if (!opts.userId || !opts.ref?.trim()) return;

  const { error } = await supabaseAdmin.from('nomad_points_ledger').insert({
    user_id: opts.userId,
    action: opts.action,
    points: def.points,
    ref: opts.ref.slice(0, 120),
    meta: opts.meta ?? null,
  });

  // 23505 = unique_violation → già accreditato, non è un errore.
  if (error && error.code !== '23505') {
    console.error('[nomad_points award]', opts.action, error.message);
  }
}

export async function listPointsForUser(userId: string): Promise<PointsLedgerRow[]> {
  const { data, error } = await supabaseAdmin
    .from('nomad_points_ledger')
    .select('id, user_id, action, points, ref, meta, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[nomad_points list]', error.message);
    return [];
  }
  return (data ?? []) as PointsLedgerRow[];
}

export async function getPointsBalance(userId: string): Promise<number> {
  const rows = await listPointsForUser(userId);
  return sumPoints(rows);
}

export function sumPoints(rows: PointsLedgerRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.points || 0), 0);
}
