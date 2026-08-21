import 'server-only';

import { addDays, format } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPoints } from '@/lib/commerce/points-ledger';
import { FOUNDING_CREATOR_CAP } from '@/lib/commerce/points';
import { evaluateQualityGate } from '@/lib/composer/quality-gate';
import { tripMinSeats } from '@/lib/trips/formation';

function isMissing(error: { code?: string } | null): boolean {
  return error?.code === '42P01' || error?.code === '42703';
}

async function participantCount(tripId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('trip_id', tripId);
  return count ?? 0;
}

async function grantBoost(tripId: string, days: number, source: string) {
  const until = format(addDays(new Date(), days), "yyyy-MM-dd'T'HH:mm:ssXXX");
  const { error } = await supabaseAdmin
    .from('trips')
    .update({ boost_until: until, boost_source: source })
    .eq('id', tripId);
  if (error && !isMissing(error)) {
    console.error('[grantBoost]', error.message);
  }
}

async function maybeFoundingCreator(opts: {
  tripId: string;
  creatorId: string;
}): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from('founding_creators')
    .select('user_id')
    .eq('user_id', opts.creatorId)
    .maybeSingle();
  if (existing?.user_id) return true;

  const { count } = await supabaseAdmin
    .from('founding_creators')
    .select('*', { count: 'exact', head: true });
  const rank = (count ?? 0) + 1;
  if (rank > FOUNDING_CREATOR_CAP) return false;

  const { error } = await supabaseAdmin.from('founding_creators').insert({
    user_id: opts.creatorId,
    trip_id: opts.tripId,
    rank,
  });
  if (error?.code === '23505') return true;
  if (error) {
    if (!isMissing(error)) console.error('[founding_creators]', error.message);
    return false;
  }
  await grantBoost(opts.tripId, 14, 'founding');
  await supabaseAdmin.from('user_perks').upsert({
    user_id: opts.creatorId,
    perk_id: 'badge_founder',
    expires_at: null,
  });
  return true;
}

export async function isFoundingCreator(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('founding_creators')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data?.user_id);
}

/** Boost Esplora sui Trip del creator che passano il quality gate. */
export async function grantExploreBoostForUser(
  userId: string,
  days: number,
  source: string
): Promise<number> {
  const until = format(addDays(new Date(), days), "yyyy-MM-dd'T'HH:mm:ssXXX");
  await supabaseAdmin.from('user_perks').upsert({
    user_id: userId,
    perk_id: source,
    expires_at: until,
  });

  const { data: trips, error } = await supabaseAdmin
    .from('trips')
    .select(
      'id, title, destination, description, start_date, end_date, price, min_participants, max_participants, planning_mode'
    )
    .eq('creator_id', userId)
    .in('status', ['forming', 'confirmed', 'published']);
  if (error && !isMissing(error)) {
    console.error('[grantExploreBoostForUser]', error.message);
    return 0;
  }

  let boosted = 0;
  for (const trip of trips ?? []) {
    const issues = evaluateQualityGate({
      title: String(trip.title ?? ''),
      destination: String(trip.destination ?? ''),
      startDate: String(trip.start_date ?? '').slice(0, 10),
      endDate: String(trip.end_date ?? '').slice(0, 10),
      description: String(trip.description ?? ''),
      budgetOrientativo: Number(trip.price) || 0,
      minParticipants: Number(trip.min_participants) || 0,
      maxParticipants: Number(trip.max_participants) || 0,
      planningMode: trip.planning_mode === 'solo' ? 'solo' : 'group',
    });
    if (issues.length) continue;
    await grantBoost(trip.id as string, days, source);
    boosted += 1;
  }
  return boosted;
}

/**
 * Dopo ogni join: soglia, raddoppio, Founding Creator.
 */
export async function syncTripFormationMilestones(tripId: string): Promise<void> {
  const { data: trip, error } = await supabaseAdmin
    .from('trips')
    .select('id, creator_id, min_participants, template_id, start_date, end_date, title, destination, description, price, max_participants, planning_mode')
    .eq('id', tripId)
    .maybeSingle();

  if (error || !trip?.creator_id) {
    if (error && !isMissing(error)) console.error('[syncTripFormation]', error.message);
    return;
  }

  const min = tripMinSeats({ minParticipants: Number(trip.min_participants) || 0 });
  let count = await participantCount(tripId);

  if (trip.template_id) {
    const { count: flightCount, error: flightErr } = await supabaseAdmin
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('seat_status', 'confirmed');
    if (!flightErr) count = flightCount ?? 0;
  }

  const founding = await isFoundingCreator(trip.creator_id as string);

  if (count >= min) {
    const becameFounding = founding
      ? true
      : await maybeFoundingCreator({
          tripId,
          creatorId: trip.creator_id as string,
        });
    await awardPoints({
      userId: trip.creator_id as string,
      action: 'group_formed',
      ref: tripId,
      foundingCreator: becameFounding,
      meta: { count, min },
    });
  }

  if (count >= min * 2) {
    await awardPoints({
      userId: trip.creator_id as string,
      action: 'group_doubled',
      ref: tripId,
      foundingCreator: founding || (await isFoundingCreator(trip.creator_id as string)),
      meta: { count, min },
    });
  }
}
