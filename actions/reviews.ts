'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { haveSharedTrip } from '@/lib/data/public-profile';
import { profilePath } from '@/lib/profile/paths';
import { awardPoints } from '@/lib/commerce/points-ledger';

const schema = z.object({
  revieweeId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(8).max(800),
});

export type LeaveReviewResult =
  | { ok: true }
  | { ok: false; error: string };

export async function leaveUserReview(input: {
  revieweeId: string;
  rating: number;
  body: string;
}): Promise<LeaveReviewResult> {
  const session = await auth();
  const reviewerId = session?.user?.id;
  if (!reviewerId) {
    return { ok: false, error: 'Accedi per lasciare una recensione.' };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Compila una recensione valida (min. 8 caratteri).' };
  }

  const { revieweeId, rating, body } = parsed.data;
  if (revieweeId === reviewerId) {
    return { ok: false, error: 'Non puoi recensire te stesso.' };
  }

  const shared = await haveSharedTrip(reviewerId, revieweeId);
  if (!shared) {
    return {
      ok: false,
      error: 'Puoi recensire solo chi ha viaggiato con te.',
    };
  }

  const { data: existing } = await supabaseAdmin
    .from('user_reviews')
    .select('id')
    .eq('reviewee_id', revieweeId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();

  if (existing?.id) {
    return { ok: false, error: 'Hai già lasciato una recensione a questo utente.' };
  }

  // Collega al viaggio condiviso più recente, se esiste
  const { data: myTrips } = await supabaseAdmin
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', reviewerId);

  let tripId: string | null = null;
  if (myTrips?.length) {
    const ids = myTrips.map((t) => t.trip_id as string);
    const { data: sharedRow } = await supabaseAdmin
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', revieweeId)
      .in('trip_id', ids)
      .limit(1)
      .maybeSingle();
    tripId = (sharedRow?.trip_id as string | undefined) ?? null;
  }

  const { error } = await supabaseAdmin.from('user_reviews').insert({
    reviewee_id: revieweeId,
    reviewer_id: reviewerId,
    trip_id: tripId,
    rating,
    body,
  });

  if (error) {
    console.error('[leaveUserReview]', error.message);
    return { ok: false, error: 'Impossibile salvare la recensione.' };
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', revieweeId)
    .maybeSingle();

  const path = profilePath(user?.username as string | null, revieweeId);
  if (path) revalidatePath(path);

  if (shared && body.trim().length >= 40 && rating >= 4) {
    await awardPoints({
      userId: reviewerId,
      action: 'review_verified',
      ref: `${reviewerId}:${revieweeId}`,
    });
  }

  return { ok: true };
}
