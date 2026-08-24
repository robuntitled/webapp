import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type UserRatingSummary = {
  avg: number | null;
  count: number;
};

export async function getUserRatingSummaries(
  userIds: string[]
): Promise<Map<string, UserRatingSummary>> {
  const map = new Map<string, UserRatingSummary>();
  if (!userIds.length) return map;

  const { data, error } = await supabaseAdmin
    .from('user_reviews')
    .select('reviewee_id, rating')
    .in('reviewee_id', userIds);

  if (error || !data) return map;

  const buckets = new Map<string, number[]>();
  for (const row of data) {
    const id = row.reviewee_id as string;
    const rating = Number(row.rating);
    if (rating < 1 || rating > 5) continue;
    const list = buckets.get(id) ?? [];
    list.push(rating);
    buckets.set(id, list);
  }

  for (const id of userIds) {
    const ratings = buckets.get(id) ?? [];
    map.set(id, {
      count: ratings.length,
      avg:
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null,
    });
  }
  return map;
}
